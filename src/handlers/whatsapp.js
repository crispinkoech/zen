const config = require('config');

const whatsappNumber = config.get('elarian.channels.whatsapp.number');

const channelParams = {
    channel: 'sms', // replace with 'whatsapp'
    number: 'Test-sender-id', // replace with relevant channel number i.e. whatsappNumber
};

const specialists = [
    { name: 'Doctor Melinda', location: 'Nairobi', code: 'A01' },
];

const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

async function generateReply(receivedText, customer, metadata) {
    const { currentstate, specialist, day, bookings } = metadata;
    

    if (!currentstate) {
        // Just arrived
        await customer.updateMetadata({
            currentstate: 'arrived',
        });

        const message = [
            'Welcome to Zen!\nYour health is our top priority.',
            'What would you like to do?',
            '\t1. Book an appointment.',
            '\t2. View pending appointments'
        ];

        const text = message.join('\n');
        return text;
    }

    if (currentstate === 'arrived') {
        if (receivedText === '1') {
            // Booking
            await customer.updateMetadata({
                currentstate: 'booking',
            });

            const message = [
                'We have the following specialists, pick one ():',
                ...specialists.map((s) => `\t${s.code}. ${s.name} at ${s.location}`),
            ];

            const text = message.join('\n');
            return text;
        }

        if (receivedText === '2') {
            // Viewing appointments
            await customer.deleteMetadata(['currentstate', 'specialist', 'day']);

            const _bookings = JSON.parse(bookings);
    
            const message = [
                'These are your pending bookings:',
                ..._bookings.map((b, idx) => `${idx+1}.\t Doctor ${b.specialist.name} on ${b.day}`),
            ];

            const text = message.join('\n');
            return text;
        }

        return 'Invalid choice, please try again.';
    }

    if (currentstate === 'booking') {
        const _specialist = specialists.find((s) => s.code === receivedText);
        if (!_specialist) {
            return 'Invalid specialist code, select one from the provided list';
        }

        // Now selecting date.
        await customer.updateMetadata({
            currentstate: 'picking-day',
            specialist: _specialist,
        });

        const text = `Pick a day (${weekdays.join(', ')})`;
        return text;
    }

    if (currentstate === 'picking-day') {
        const _day = weekdays.find((d) => d === receivedText);
        if (!_day) {
            return 'Invalid day picked';
        }

        await customer.updateMetadata({
            currentstate: 'confirming',
            day: _day,
        });

        const message = [
            `Confirm these details for your appointments ('Yes' to accept, 'No' to cancel):`,
            `\tSpecialist: ${specialist}`,
            `\tDay: ${_day}`,
        ];

        const text = message.join('\n');
        return text;
    }

    if (currentstate === 'confirming') {
        await customer.deleteMetadata(['currentstate', 'specialist', 'day']);

        if (receivedText === 'yes') {
            const _bookings = bookings ? JSON.parse(bookings) : [];

            _bookings.push({ day, specialist });

            await customer.updateMetadata({
                bookings: JSON.stringify(_bookings),
            });

            return 'Alright, booking confirmed';
        }

        return text = 'Canceled.';
    }

    // Clear session data
    await customer.deleteMetadata(['currentstate', 'specialist', 'day']);
    return 'Something went wrong, please try again.';
}

async function replyToMessage(text, customer) {
    const customerNumber = customer.customerNumber.number;

    const messageParams = {
        body: {
            text,
        },
    };

    customer
        .sendMessage(channelParams, messageParams)
        .then((resp) => {
            if (resp.status !== 'sent') {
                throw new Error(`Failed to send message: ${resp.description}`);
            }

            console.info(`Forwarded message to customer ${customerNumber}`);
        })
        .catch((err) => {
            console.error(`Failed to forward message to customer ${customerNumber} with error ${err}`);
            customer.deleteMetadata(['currentstate', 'specialist', 'day']);
        });
}

async function receivedMessageHandler(notification, customer) {
    const receivedMessage = notification.text || '';

    const customerState = await customer.getState();

    const {
        identityState: {
            metadata = {},
        } = {},
    } = customerState;

    const text = await generateReply(receivedMessage, customer, metadata);
    await replyToMessage(text, customer);
}

function registerHandler(elarianClient) {
    elarianClient.on('receivedWhatsapp', receivedMessageHandler);
}

module.exports = registerHandler;
