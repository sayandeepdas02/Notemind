module.exports = {
    // Media controls (we use CSS + text selectors or aria-labels for better resilience)
    micButton: 'button[aria-label*="microphone"]',
    cameraButton: 'button[aria-label*="camera"]',

    // Name input when joining as a guest
    nameInput: 'input[aria-label="Your name"], input[placeholder="Your name"], input[type="text"]',

    // Join buttons
    askToJoinButton: 'button:has-text("Ask to join")',
    joinNowButton: 'button:has-text("Join now")',

    // State indicators
    askingToJoinText: 'text="Asking to join"',
    inCallIndicator: 'button[aria-label="Leave call"]', // If we see the leave call button, we are in
    errorBanner: 'text="You can\'t join this call"'
};
