const { joinMeeting } = require('./joiner');

const meetUrl = process.argv[2];

if (!meetUrl) {
    console.error('Usage: node index.js <google-meet-link>');
    console.error('Example: node index.js https://meet.google.com/abc-defg-hij');
    process.exit(1);
}

// Validate basic URL structure
if (!meetUrl.startsWith('https://meet.google.com/')) {
    console.error('Error: Please provide a valid Google Meet URL.');
    process.exit(1);
}

console.log('🚀 Starting Notemind AI Bot POC...');
joinMeeting(meetUrl).catch(err => {
    console.error('Fatal error:', err);
});
