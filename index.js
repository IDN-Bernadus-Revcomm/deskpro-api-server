// index.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Function to format the phone number
function formatPhoneNumber(rawNumber) {
    let digits = rawNumber.replace(/\D/g, '');

    if (digits.startsWith('62')) {
        digits = digits.slice(2); // Remove '62' country code
    } else if (digits.startsWith('0')) {
        digits = digits.slice(1); // Remove leading '0'
    }

    /*if (digits.length < 7) {
        return "+62 (0) " + digits +" 000 1234"; // Handle short numbers directly
    }*/

    let formattedNumber = "+62 (0) ";
    if (digits.length >= 10) {
        formattedNumber += digits.slice(0, 3) + " " + digits.slice(3, 6) + " " + digits.slice(6);
    } else if (digits.length >= 7) {
        formattedNumber += digits.slice(0, 3) + " " + digits.slice(3);
    } else {
        formattedNumber += digits +" 000 1234"; 
    }

    return formattedNumber;
}

// Endpoint to create a new ticket in Deskpro
app.post('/create-ticket', async (req, res) => {
    // Extract ticket data from request body
    const { phoneNumber } = req.body;

    // Format the phone number using the function
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber);

    // Generate the current date and time
    const now = new Date();
    const date = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const time = now.toTimeString().split(' ')[0]; // Format: HH:MM:SS

    // Static values for message content and dynamic subject
    const subject = `Ticket: ${formattedPhoneNumber} - ${date} ${time}`;
    const messageContent = `This ticket created from Miitel for phone number ${formattedPhoneNumber}`;

    // Step 1: Create the ticket with a static person name "Unknown"
    const ticketData = {
        subject: subject,
        agent: "5",
        person: {
            name: "Unknown", // Static name for the person
            email: "Unknown@Miitel.com"
        },
        message: {
            message: messageContent,
            format: "html"
        }
    };

    try {
        // Create the ticket
        const ticketResponse = await axios.post(
            'https://revcomm.deskpro.com/api/v2/tickets',
            ticketData,
            {
                headers: {
                    'Authorization': 'key 2:KAHSQ7Q9PBMW9GNW5RW9N3Q3A',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Step 2: Get the person ID from the ticket creation response
        const personId = ticketResponse.data.data.person;

        // Step 3: Update the person's phone number with static label "Work" if phoneNumber is provided
        if (phoneNumber) {
            const phoneData = {
                phone_numbers: [
                    {
                        label: "Work",
                        number: formattedPhoneNumber
                    }
                ]
            };

            await axios.put(
                `https://revcomm.deskpro.com/api/v2/people/${personId}`,
                phoneData,
                {
                    headers: {
                        'Authorization': 'key 2:KAHSQ7Q9PBMW9GNW5RW9N3Q3A',
                        'Content-Type': 'application/json'
                    }
                }
            );
        }

        // Respond to the client with Deskpro's response
        res.status(200).json({
            success: true,
            message: "Ticket created and phone number updated",
            data: ticketResponse.data
        });
    } catch (error) {
        console.error('Error creating ticket:', error.response?.data || error.message);

        // Respond with an error message
        res.status(500).json({
            success: false,
            message: 'Failed to create ticket in Deskpro',
            error: error.response?.data || error.message
        });
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});