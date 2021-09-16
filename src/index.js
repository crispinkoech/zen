const config = require('config');

const { Elarian } = require('elarian');

const registerWhatsappHandler = require('./handlers/whatsapp');

let elarianClient;

const credentials = config.get('elarian.credentials');

// Start the zen app.
async function start() {
    elarianClient = new Elarian(credentials);

    await new Promise((resolve, reject) => {
        elarianClient
            .on('error', (err) => {
                reject(err);
            })
            .on('connected', () => {
                resolve();
            })
            .connect();
    });
}

if (require.main === module) {
    start()
        .then(() => {
            // Bootstrap handlers
            registerWhatsappHandler(elarianClient);
        })
        .then(() => {
            console.info('Zen mode activated');
        })
        .catch((err) => {
            console.error(`Failed to start with error -> ${err}}`);
            process.exit(1);
        })
}
