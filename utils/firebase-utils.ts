import * as firebaseApp from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, getDocs, where } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from "firebase/auth";
import { TrafficViolation } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyD5spc3lz9FNNgRc42qIuFs7MJA0Cxl0x4",
  authDomain: "traffic-sentinel-ec13c.firebaseapp.com",
  projectId: "traffic-sentinel-ec13c",
  storageBucket: "traffic-sentinel-ec13c.firebasestorage.app",
  messagingSenderId: "317616690710",
  appId: "1:317616690710:web:fd3a62947b273251900737",
  measurementId: "G-HEHZFEL6HP"
};

// Initialize Firebase
const app = firebaseApp.initializeApp(firebaseConfig);
const db = getFirestore(app);
export const auth = getAuth(app);

/**
 * Firestore does not accept 'undefined' values, only 'null'.
 * This helper converts any undefined fields in an object to null.
 */
function sanitizeForFirestore(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    return value === undefined ? null : value;
  }));
}

// --- AUTHENTICATION UTILS ---

export const loginUser = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    // FALLBACK: If Firebase Auth is not enabled/configured in Console, but creds match our hardcoded admin,
    // we allow access via "Demo Mode".
    if (
        (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') &&
        email === 'i_am_traffic_police@gmail.com' && 
        pass === 'we_are_techie'
    ) {
        console.warn("⚠️ Firebase Auth not configured. Falling back to Demo Admin mode.");
        
        const demoUser = { 
            uid: 'demo-admin-123', 
            email: email, 
            displayName: 'Traffic Officer (Demo)',
            emailVerified: true,
            isAnonymous: false,
            metadata: {},
            providerData: [],
            refreshToken: '',
            tenantId: null,
            delete: async () => {},
            getIdToken: async () => 'demo-token',
            getIdTokenResult: async () => ({ token: 'demo', signInProvider: 'password', claims: {}, authTime: '', issuedAtTime: '', expirationTime: '' }),
            reload: async () => {},
            toJSON: () => ({})
        };
        
        localStorage.setItem('demo_user', JSON.stringify(demoUser));
        window.dispatchEvent(new Event('auth-state-change'));
        return demoUser as unknown as User;
    }

    console.error("Login Failed", error);
    throw error;
  }
};

export const registerUser = async (email: string, pass: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Registration Failed", error);
    // If registration fails due to config, check if we should allow demo mode
    if (
        (error.code === 'auth/configuration-not-found' || error.code === 'auth/operation-not-allowed') &&
        email === 'i_am_traffic_police@gmail.com' && 
        pass === 'we_are_techie'
    ) {
         // Delegate to loginUser to handle the demo session creation
         return loginUser(email, pass);
    }
    throw error;
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
     console.warn("Firebase logout warning", error);
  }
  // Clear demo mode if active
  localStorage.removeItem('demo_user');
  window.dispatchEvent(new Event('auth-state-change'));
};

// ----------------------------

export async function saveViolationToFirestore(violation: TrafficViolation): Promise<string | null> {
  try {
    const { vehicle_number, violation_type } = violation;

    // --- DEDUPLICATION LOGIC ---
    // If we have a valid vehicle number, check for duplicates within 2 hours
    if (vehicle_number && vehicle_number !== "UNKNOWN") {
      // Query recent violations for this specific vehicle
      // We query strictly by vehicle_number first.
      const q = query(
        collection(db, "violations"), 
        where("vehicle_number", "==", vehicle_number)
      );

      const querySnapshot = await getDocs(q);
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

      const isDuplicate = querySnapshot.docs.some(doc => {
        const data = doc.data();
        
        // 1. Check Timestamp (Server time or fallback to client time)
        let recordTime = 0;
        
        // Handle Firestore Timestamp or ISO string
        if (data.server_created_at?.toMillis) {
          recordTime = data.server_created_at.toMillis();
        } else if (data.timestamp) {
          // If it's a string, convert to milliseconds
          recordTime = new Date(data.timestamp).getTime();
        }

        // If data is invalid/missing timestamp, skip it (assume safe to write new one?) 
        // Or assume it's old. Let's assume it's old if missing.
        if (!recordTime) return false;

        // Only consider records from the last 2 hours
        if (recordTime < twoHoursAgo) return false;

        // 2. Check Crime Similarity
        // If the new violation contains ANY crime that was already recorded for this vehicle recently
        // we consider it the same "incident" and skip saving.
        const existingTypes = (data.violation_type as string[]) || [];
        
        // Check if there is ANY overlap in violation types
        const hasOverlap = violation_type.some(t => existingTypes.includes(t));
        
        if (hasOverlap) {
            console.log(`Checking duplicates: Found existing violation '${existingTypes.join(',')}' at ${new Date(recordTime).toLocaleTimeString()}`);
        }
        
        return hasOverlap;
      });

      if (isDuplicate) {
        console.log(`⚠️ DEDUPLICATION: Violation for ${vehicle_number} skipped. (Same vehicle + Same crime detected within 2hrs).`);
        return "DUPLICATE";
      }
    }
    // ---------------------------

    console.log("🚀 Sending violation payload to Firestore:", violation);

    // 1. Sanitize the object to remove 'undefined' values which crash Firestore
    const cleanViolation = sanitizeForFirestore(violation);

    // 2. Add server-side timestamp for accurate chronological sorting
    const payload = {
      ...cleanViolation,
      server_created_at: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "violations"), payload);
    console.log("✅ VIOLATION SAVED SUCCESSFULLY! Doc ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("❌ CRITICAL ERROR: Failed to save to Firestore", e);
    return null;
  }
}

export async function getViolationsFromFirestore(): Promise<TrafficViolation[]> {
  try {
    const q = query(collection(db, "violations"), orderBy("server_created_at", "desc"));
    const querySnapshot = await getDocs(q);
    const violations: TrafficViolation[] = [];
    querySnapshot.forEach((doc) => {
      // @ts-ignore - casting data
      violations.push(doc.data() as TrafficViolation);
    });
    return violations;
  } catch (error) {
    console.error("Error fetching violations from Firestore:", error);
    return [];
  }
}