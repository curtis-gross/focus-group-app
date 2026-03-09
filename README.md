# AI App Template

This folder contains the baseline structure for creating new AI-powered applications in the `ai-lab`.

## Usage

To create a new app from this template:

1.  **Copy the folder**:
    ```bash
    cp -r ai-lab/app-template ai-lab/my-new-app
    ```

2.  **Initialize**:
    ```bash
    cd ai-lab/my-new-app
    npm install
    ```

3.  **Configure**:
    *   Edit `package.json` to update the `"name"` field.
    *   Edit `cloud_run.sh` to update the `SERVICE_NAME` variable.

4.  **Develop**:
    *   Run `./start_local.sh` to start the development server.
    *   Edit `App.tsx` to build your UI.
    *   Edit `server.js` for backend logic.
    *   Edit `services/geminiService.ts` for AI interactions.

5.  **Deploy**:
    *   Run `./setup_api_key.sh` (once per project) to upload secrets.
    *   Run `./cloud_run.sh` to deploy.