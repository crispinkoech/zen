
/**
 * An example usage of this app.
 * 
 * This example uses the simulator module packaged within the Elarian sdk 
 *      to simulate actions made by an actual user on their mobile app (Whatsapp).
 */

const config = require('config');

const { Simulator } = require('elarian');

let simulator;

const credentials = config.get('elarian.credentials');
const number = config.get('elarian.channels.whatsapp.number');

// Connect the simulator to the elarian backend.
async function initialize() {
    simulator = new Simulator(credentials);

    await new Promise((resolve, reject) => {
        simulator
            .on('error', (err) => {
                reject(err);
            })
            .on('connected', () => {
                resolve();
            })
            .connect();
    });
}

/**
 * Human-like interactions via the simulator.
 * 
 *      - sendMessage(): It.....sends a message.
 * 
 *      - onReceiveMessage(): It handles the notifications sent from the elarian client to our simulator.
*/

async function sendMessage(text, to = '+254738523316') {
    const channel = { number, channel: 'whatsapp' };

    // Send initial message;
    const messages = [{ text }];

    // Confusing?
    // View this from the perspective of the elarian client (that will receive this message(s)).
    await simulator.receiveMessage(to, channel, 'some-session-id', messages);
}

async function onReceiveMessage(data) {
    const { message: { body: { text } } } = data;

    console.log(text);
    
    if (text.startsWith('Welcome')) {
        // View specialists
        await sendMessage('1');
        return;
    }

    if (text.startsWith('We have the following specialists')) {
        // Select specialist
        await sendMessage('A01');
        return;
    }

    if (text.startsWith('Pick a day')) {
        // Select a day
        await sendMessage('Thursday');
        return;
    }

    if (text.startsWith('Confirm')) {
        // confirm
        await sendMessage('yes');
        return;
    }
}

if (require.main === module) {
    initialize()
        .then(() => {
            // Boostrap handlers
            simulator.on('sendMessage', onReceiveMessage);
        })
        .then(() => {
            console.info('Connected to elarian; ready to achieve zen mode');
        })
        .then(() => {
            // Send that initial message.
            return sendMessage('Is there anybody there');
        })
        .catch((err) => {
            console.error(`Failed to connect to zen app :( with error -> ${err} `);
            process.exit(1);
        });
}
