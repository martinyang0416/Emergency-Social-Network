import { verifyTokenAndRedirect, logout } from "./utils/authUtils.js";
import { initializeSocket, handleSpeedTestEvent } from "./utils/socketUtils.js";

document.addEventListener("DOMContentLoaded", function () {
    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);

    const socket = initializeSocket();

    handleSpeedTestEvent(socket, logout);

    const ownerusername = sessionStorage.getItem("username");

    socket.on(
        "outgoing connect request",
        function ({ contactusername, timestamp }) {
            console.log(
                "Outgoing connect request to ",
                contactusername,
                " at ",
                timestamp
            );
            displayPendingUsers(ownerusername);
            displayUnaddedUsers(ownerusername);
        }
    );

    socket.on(
        "incoming connect request",
        function ({ ownerusername: senderUsername, timestamp }) {
            console.log(
                "Incoming connect request from ",
                senderUsername,
                " at ",
                timestamp
            );
            alertPopup(
                "Connect Request",
                `Connect request from ${senderUsername}`
            );

            displayPendingUsers(ownerusername);
            displayUnaddedUsers(ownerusername);
        }
    );

    socket.on("connect request accepted", function ({ contactusername }) {
        console.log("Connect request accepted by ", contactusername);
        displayAddedUsers(ownerusername);
        displayPendingUsers(ownerusername);
        displayUnaddedUsers(ownerusername);
    });

    socket.on(
        "connect request accepted by contact",
        function ({ contactusername }) {
            console.log("Connect request accepted by ", contactusername);
            alertPopup(
                "Connect Request",
                `Connect request accepted by ${contactusername}`
            );
            displayAddedUsers(ownerusername);
            displayPendingUsers(ownerusername);
            displayUnaddedUsers(ownerusername);
        }
    );

    socket.on("connect request declined", function ({ contactusername }) {
        console.log("Connect request declined by ", contactusername);
        displayPendingUsers(ownerusername);
        displayUnaddedUsers(ownerusername);
    });

    socket.on(
        "connect request declined by contact",
        function ({ contactusername }) {
            console.log("Connect request declined by ", contactusername);
            alertPopup(
                "Connect Request",
                `Connect request declined by ${contactusername}`
            );
            displayPendingUsers(ownerusername);
            displayUnaddedUsers(ownerusername);
        }
    );

    // Display added users
    displayAddedUsers(ownerusername);

    // Display pending users
    displayPendingUsers(ownerusername);

    // Display unadded uers
    displayUnaddedUsers(ownerusername);

    function displayAddedUsers(ownerusername) {
        // Display added Users
        fetch(`/emergencyContact/${ownerusername}/added`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((addedUsers) => {
                // Process the list of unadded users
                console.log("Added contacts:", addedUsers);

                // Display in a user-list
                const addedList = document.getElementById("added-users");
                addedList.innerHTML = ""; // Clear any previous entries
                addedUsers.forEach((user) => {
                    const user_name = user.username;
                    const addedUserComponent =
                        createAddedUserComponent(user_name);
                    appendUser(addedList, addedUserComponent);
                });
            })
            .catch((error) => {
                console.error("Error fetching added contact:", error);
            });
    }

    function displayPendingUsers(ownerusername) {
        fetch(`/emergencyContact/${ownerusername}/pending`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then(({ incomingPendingUsers, outgoingPendingUsers }) => {
                // Process the list of unadded users
                console.log("incmoing Pending contacts:", incomingPendingUsers);
                console.log("outgoing Pending contacts:", outgoingPendingUsers);

                // Display in a user-list
                const pendingList = document.getElementById("pending-users");
                pendingList.innerHTML = ""; // Clear any previous entries
                incomingPendingUsers.forEach((user) => {
                    const user_name = user.username;
                    const pendingUserComponent =
                        createIncomingPendingUserComponent(user_name);
                    appendUser(pendingList, pendingUserComponent);
                });

                outgoingPendingUsers.forEach((user) => {
                    const user_name = user.username;
                    const pendingUserComponent =
                        createOutgoingPendingUserComponent(user_name);
                    appendUser(pendingList, pendingUserComponent);
                });
            })
            .catch((error) => {
                console.error("Error fetching pending contact:", error);
            });
    }

    function displayUnaddedUsers(ownerusername) {
        fetch(`/emergencyContact/${ownerusername}/available`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then((response) => response.json())
            .then((unaddedUsers) => {
                // Process the list of unadded users
                console.log("Available contacts:", unaddedUsers);

                // Display in a user-list
                const unaddedList = document.getElementById("unadded-users");
                unaddedList.innerHTML = ""; // Clear any previous entries
                unaddedUsers.forEach((user) => {
                    const user_name = user.username;
                    const unaddedUserComponent =
                        createUnaddedUserComponent(user_name);
                    appendUser(unaddedList, unaddedUserComponent);
                });
            })
            .catch((error) => {
                console.error("Error fetching available contact:", error);
            });
    }

    function sendRequestToUnaddedContact(ownerusername, contactusername) {
        const requestBody = {
            ownerusername: ownerusername,
            contactusername: contactusername,
        };

        fetch("/emergencyContact/request", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })
            .then((response) => response.json())
            .catch((error) => console.error("Error sending message:", error));
    }

    function createUserItem(user_name) {
        const newListItem = document.createElement("li");
        newListItem.className =
            "list-group-item d-flex justify-content-between";
        newListItem.textContent = user_name;

        return newListItem;
    }

    function createAddedUserItem(user_name) {
        const newListItem = document.createElement("a");
        newListItem.className = "list-group-item list-group-item-action";
        newListItem.textContent = user_name;
        newListItem.href = `/emergencyContact/sharing/${user_name}`;

        return newListItem;
    }

    function createAddedUserComponent(user_name) {
        const newListItem = createAddedUserItem(user_name);

        // Create a button to append to the link item
        const button = document.createElement("button");
        button.className = "btn btn-sm btn-danger"; // Add classes for styling (Bootstrap example)
        button.textContent = "Remove"; // Set button text

        // button.addEventListener("click", () => {
        //     // Show confirmation alert
        //     const isConfirmed = window.confirm(
        //         `Are you sure you want to remove ${user_name}?`
        //     );

        //     if (isConfirmed) {
        //         // Remove the user from the list
        //         fetch(`/emergencyContact/remove`, {
        //             method: "POST",
        //             headers: {
        //                 "Content-Type": "application/json",
        //             },
        //             body: JSON.stringify({
        //                 user_name: user_name, // ID of the user to be removed
        //             }),
        //         })
        //             .then((response) => {
        //                 if (!response.ok) {
        //                     throw new Error("Failed to remove user.");
        //                 }
        //                 return response.json();
        //             })
        //             .then((data) => {
        //                 // Update the list
        //                 alert(`${user_name} has been removed.`);
        //                 displayAddedUsers(ownerusername); // Call a function to update the added list
        //             })
        //             .catch((error) => {
        //                 console.error("Error removing user:", error);
        //                 alert("An error occurred while removing the user.");
        //             });
        //     }
        // });

        // Append the button to the link item
        // newListItem.appendChild(button);

        return newListItem;
    }

    function createIncomingPendingUserComponent(user_name) {
        const newListItem = createUserItem(user_name);

        // Create accept and decline button
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "btn-group"; // Add classes for styling (Bootstrap example)

        const buttonAceept = document.createElement("button");
        const buttonDecline = document.createElement("button");

        buttonAceept.className = "btn btn-sm btn-success";
        buttonDecline.className = "btn btn-sm btn-danger";

        buttonAceept.textContent = "Accept";
        buttonDecline.textContent = "Decline";

        buttonAceept.addEventListener("click", () => {
            // Show confirmation alert
            // const isConfirmed = window.confirm(
            //     `Are you sure you want to accept ${user_name}?`
            // );
            showConfirmationPopup(
                "Accept Contact",
                `Are you sure you want to accept ${user_name}?`
            ).then((result) => {
                if (result.isConfirmed) {
                    // Accept the user
                    fetch(`/emergencyContact/acceptance`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contactusername: ownerusername,
                            ownerusername: user_name,
                        }),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error("Failed to accept user.");
                            }
                            return response.json();
                        })
                        .catch((error) => {
                            console.error("Error accepting user:", error);
                            alert(
                                "An error occurred while accepting the user."
                            );
                        });
                }
            });
        });

        buttonDecline.addEventListener("click", () => {
            // Show confirmation alert
            // const isConfirmed = window.confirm(
            //     `Are you sure you want to decline ${user_name}?`
            // );
            showConfirmationPopup(
                "Decline Contact",
                `Are you sure you want to decline ${user_name}?`
            ).then((result) => {
                if (result.isConfirmed) {
                    // Decline the user
                    fetch(`/emergencyContact/denial`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            contactusername: ownerusername,
                            ownerusername: user_name,
                        }),
                    })
                        .then((response) => {
                            if (!response.ok) {
                                throw new Error("Failed to decline user.");
                            }
                            return response.json();
                        })
                        .catch((error) => {
                            console.error("Error declining user:", error);
                            alert(
                                "An error occurred while declining the user."
                            );
                        });
                }
            });
        });

        buttonGroup.appendChild(buttonAceept);
        buttonGroup.appendChild(buttonDecline);
        newListItem.appendChild(buttonGroup);

        return newListItem;
    }

    function createOutgoingPendingUserComponent(user_name) {
        const newListItem = createUserItem(user_name);

        // Create a text span to append to the link item
        const requestSentText = document.createElement("span");
        requestSentText.className = "text-muted ml-2"; // Add classes for styling
        requestSentText.textContent = "Request sent"; // Set text content

        newListItem.appendChild(requestSentText);

        return newListItem;
    }

    function createUnaddedUserComponent(user_name) {
        const newListItem = createUserItem(user_name);

        // Create a button to append to the link item
        const button = document.createElement("button");
        button.className = "btn btn-sm btn-primary"; // Add classes for styling (Bootstrap example)
        button.textContent = "Add"; // Set button text

        button.addEventListener("click", () => {
            // Show confirmation alert
            // const isConfirmed = window.confirm(
            //     `Are you sure you want to add ${user_name}?`
            // );

            // if (isConfirmed) {
            //     sendRequestToUnaddedContact(ownerusername, user_name);
            // }
            showConfirmationPopup(
                "Add Contact",
                `Are you sure you want to add ${user_name}?`
            ).then((result) => {
                if (result.isConfirmed) {
                    sendRequestToUnaddedContact(ownerusername, user_name);
                } else {
                    console.log("User cancelled add contact.");
                }
            });
        });

        // Append the button to the link item
        newListItem.appendChild(button);

        return newListItem;
    }

    function appendUser(userList, userItem) {
        userList.appendChild(userItem);
    }

    function showConfirmationPopup(title, text) {
        return Swal.fire({
            title: title,
            text: text,
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#00b894",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes",
        });
    }
    function alertPopup(title, text) {
        return Swal.fire({
            title: title,
            text: text,
            icon: "info",
            confirmButtonColor: "#00b894",
        });
    }
});
