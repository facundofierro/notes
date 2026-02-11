# Improve Prompt Area UI and Functionality

I will enhance the right sidebar prompt area to be more visually consistent with the tool cards and add several powerful features: file referencing, image uploading, voice-to-text, and full prompt copying.

## Technical Implementation

### 1. UI Refactoring

- **Rounded Container**: Wrap the prompt `textarea` in a new `div` with `rounded-xl` corners, matching the style of the tool cards below.
- **Bottom Toolbar**: Add a toolbar inside the rounded container at the bottom, containing:
  - **Left**: `@` button (file reference) and Image icon (upload image).
  - **Right**: Microphone icon (speech-to-text) and Copy icon (copy full agent prompt).
- **Focus Effects**: Apply consistent border and ring styles (`focus-within:ring-2 focus-within:ring-blue-600`) to the entire container when the textarea is active.

### 2. File Referencing (@)

- **File List**: Reuse existing file-tree logic to fetch a flat list of files from the repository.
- **Autocomplete**: Implement a simple dropdown that appears when typing `@` or clicking the `@` button.
- **Short View vs. Full Path**:
  - The textarea will show the file name (e.g., `@App.tsx`).
  - A mapping of `filename -> fullPath` will be maintained in state.
  - When building the final prompt, these references will be replaced with their absolute paths for the AI agent.

### 3. Full Prompt Copying

- **Full Prompt Logic**: Implement a `handleCopyFullPrompt` function that uses the existing `buildToolPrompt` logic to generate the exact string sent to AI tools.
- **Clipboard Integration**: Copy the generated full prompt to the system clipboard.

### 4. Speech-to-Text (Mic)

- **Web Speech API**: Use the browser's built-in `SpeechRecognition` interface (no external API keys required).
- **Voice Input**: Toggle recording with the microphone button and append the transcribed text directly to the prompt area.

### 5. Image Uploading

- **New API Route**: Create `/api/upload` to handle `multipart/form-data`.
- **Storage**: Save uploaded images to a temporary directory (`public/temp/images/`) with unique filenames (timestamp + random ID).
- **Prompt Integration**: Append the uploaded image's local path to the prompt text.

### 6. Cleanup & Maintenance

- **Image Cleanup**: Implement a simple check during upload to remove old temporary images (older than 24h).

## Proposed Steps

1. **Create Image Upload API**: Implement `apps/web/src/app/api/upload/route.ts`.
2. **Refactor UI**: Update `apps/web/src/app/page.tsx` with the new rounded container and toolbar.
3. **Implement State & Handlers**: Add state for file/image mappings and implement the logic for `@` mentions, audio recording, and clipboard copying.
4. **Update Prompt Builder**: Ensure `buildToolPrompt` correctly handles the new reference formats.

Does this plan cover everything you need? I can start with the UI changes or the API route first.
