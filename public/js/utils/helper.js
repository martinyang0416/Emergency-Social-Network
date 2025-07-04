// Function to determine the correct status icon based on the citizenStatus
export function getStatusIcon(citizenStatus) {
    switch (citizenStatus) {
        case "OK":
            return { icon: "check_circle", color: "green" };
        case "Help":
            return { icon: "warning", color: "yellow" };
        case "Emergency":
            return { icon: "e911_emergency", color: "red" };
        case "Undefined":
            return { icon: "help_center", color: "lightgrey" };
    }
}

export function endSpeedTest(testResult) {
    try {
        fetch("/end-speed-test", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            // body: JSON.stringify({ duration, interval })
        })
            .then((response) => response.json())
            .then(() => {
                // Display test result
                const testResults = document.getElementById("testResults");
                testResults.innerHTML = testResult;
            })
            .catch((error) => console.error("Error:", error));
    } catch (error) {
        console.error("error stopping the speed test: ", error);
    }
}

export function appendMessage(messageContainer, msg, displayStatus = true) {
    // const messageContainer = document.getElementById("message-container");
    const sender = msg.message_sender;
    const citizenStatus = msg.message_sender_status;
    const messageDate = new Date(msg.message_sent_time);
    const formattedTime = `${messageDate.toLocaleDateString()} ${messageDate.toLocaleTimeString()}`;
    const content = msg.message_text;
    // console.log(sender);
    // console.log(citizenStatus);

    // Create card element
    const cardElement = document.createElement("div");
    cardElement.className = "card border-success mb-3";

    // Create card header
    const cardHeaderElement = document.createElement("div");
    cardHeaderElement.className =
        "card-header d-flex justify-content-between align-items-center";

    const senderAndStatusElement = document.createElement("div"); // Create sender and status element
    senderAndStatusElement.className = "sender-info d-flex align-items-center";
    const senderElement = document.createElement("strong"); // Create sender
    senderElement.className = "sender-name text-truncate";
    senderElement.textContent = sender; // Set sender name

    // Conditionally add the status icon based on displayStatus
    if (displayStatus) {
        const statusIconData = getStatusIcon(citizenStatus);
        const statusElement = document.createElement("span");
        statusElement.className = "material-symbols-outlined ms-1";
        statusElement.textContent = statusIconData.icon;
        statusElement.style.color = statusIconData.color;

        senderAndStatusElement.appendChild(statusElement);
    }

    senderAndStatusElement.appendChild(senderElement);
    cardHeaderElement.appendChild(senderAndStatusElement);

    // Create timestamp element for the header
    const timeElement = document.createElement("small");
    timeElement.className = "text-muted timestamp";
    timeElement.textContent = formattedTime;

    // Append the timestamp to the header
    cardHeaderElement.appendChild(timeElement);

    // Create the card body (message content)
    const cardBodyElement = document.createElement("div");
    cardBodyElement.className = "card-body";

    const messageContentElement = document.createElement("p");
    messageContentElement.className = "card-text message-content";
    messageContentElement.textContent = content;

    // Append message content to the card body
    cardBodyElement.appendChild(messageContentElement);

    // Append the header and body to the card
    cardElement.appendChild(cardHeaderElement);
    cardElement.appendChild(cardBodyElement);

    // Finally, append the card to the messages container
    messageContainer.appendChild(cardElement);

    return cardElement;
}
