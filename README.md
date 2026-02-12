
# Gemini Traffic Sentinel

## Overview

Gemini Traffic Sentinel is an automated violation detection system designed to analyze real-time video feeds for traffic rule compliance. By leveraging the advanced capabilities of the Google Gemini API, this application processes live camera data to identify and report violations instantly.

The system features a comprehensive interface that includes a live video feed with a heads-up display, a violation panel for reviewing detected incidents, and an administrative dashboard for managing system settings and reviewing historical data. It supports seamless camera switching and integrates with Firebase for secure authentication.

## Features

- **Real-Time Analysis**: utilizing the Gemini API to process video streams and detect traffic violations as they happen.
- **Interactive Interface**: A clean, modern user interface built with React and Tailwind CSS, featuring a heads-up display overlay on the video feed.
- **Violation Reporting**: An integrated panel that logs and displays detected violations for immediate review.
- **Admin Dashboard**: A secure area for administrators to manage the system and view detailed reports.
- **Authentication**: Secure login system powered by Firebase, with support for a demonstration mode.
- **Multi-Camera Support**: Easily switch between available video inputs to monitor different angles or sources.

## Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

Ensure you have the following installed:
- Node.js (version 18 or higher is recommended)
- A valid Google Gemini API Key

### Installation

1.  **Clone the repository:**
    Clone this project to your local machine.

2.  **Install dependencies:**
    Navigate to the project directory and install the necessary packages using npm:
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a file named `.env.local` in the root of your project. Add your Gemini API key to this file:
    ```
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    Note: Ensure your API key has the necessary permissions for the Gemini API.

4.  **Run the Application:**
    Start the development server:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the local URL provided in the terminal.

## Usage

Once the application is running, grant camera permissions when prompted. The main interface will display the live video feed. Use the control panel to connect to the analysis service or switch cameras. If you need to access administrative features, use the login button to authenticate.

For demonstration purposes, if Firebase is not fully configured, the system may fall back to a demo user mode as defined in the source code.

## Technologies Used

- React
- Vite
- TypeScript
- Tailwind CSS
- Google Gemini API
- Firebase Authentication

## License

This project is open source and available under the MIT License.
