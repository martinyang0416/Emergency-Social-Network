import { verifyTokenAndRedirect, logout } from "./utils/authUtils.js";
import { initializeSocket, handleSpeedTestEvent } from "./utils/socketUtils.js";

document.addEventListener("DOMContentLoaded", function () {
    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);
    const socket = initializeSocket();
    handleSpeedTestEvent(socket, logout);

    const ownerusername = sessionStorage.getItem("username");

    // Get contact username from the URL
    const url = new URL(window.location.href);
    const contactusername = url.pathname.split("/").pop();
    console.log("Contact Username:", contactusername);

    socket.on("resource updated", function (msg) {
        console.log("Resource updated:", msg);
        displayResources(ownerusername);
        displayResources(contactusername);
    });

    const waterButton = document.getElementById("water-share-button");
    const breadButton = document.getElementById("bread-share-button");
    const medicineButton = document.getElementById("medicine-share-button");

    // Fetch resource information for ownerusername
    displayResources(ownerusername);

    // Fetch resource information for contactusername
    displayResources(contactusername);

    listenForResourceSharing("water", waterButton);
    listenForResourceSharing("bread", breadButton);
    listenForResourceSharing("medicine", medicineButton);

    function displayResources(userName) {
        // Display the resources
        fetch(`/emergencyContact/resources/${userName}`)
            .then((response) => response.json())
            .then((resources) => {
                console.log(resources);
                // Process the retrieved resource information
                resources.forEach((resource) => {
                    const water = resource.water;
                    const bread = resource.bread;
                    const medicine = resource.medicine;

                    let waterElement =
                        document.getElementById("owner-water-count");
                    let breadElement =
                        document.getElementById("owner-bread-count");
                    let medicineElement = document.getElementById(
                        "owner-medicine-count"
                    );

                    if (userName === contactusername) {
                        document.getElementById(
                            "user-card-title"
                        ).textContent = `Resources ${userName} Has`;
                        // Display the resources for the contact user
                        waterElement = document.getElementById(
                            "contact-water-count"
                        );
                        breadElement = document.getElementById(
                            "contact-bread-count"
                        );
                        medicineElement = document.getElementById(
                            "contact-medicine-count"
                        );
                    }

                    waterElement.textContent = water;
                    breadElement.textContent = bread;
                    medicineElement.textContent = medicine;
                });
            })
            .catch((error) => {
                console.error("Error fetching resource information:", error);
            });
    }

    function listenForResourceSharing(resourceType, buttonElement) {
        buttonElement.addEventListener("click", function () {
            const count = document.getElementById(
                `${resourceType}-input`
            ).value;
            let resourceElement = document.getElementById(
                `owner-${resourceType}-count`
            );

            if (count === "") {
                alert("Invalid count: Please enter a valid number.");
                return;
            }

            if (parseInt(count) > parseInt(resourceElement.textContent)) {
                alert(
                    "Invalid count: You cannot share more resources than you have."
                );
                return;
            }

            shareResource(resourceType, count);
        });
    }

    function shareResource(resourceType, count) {
        const data = {
            ownerusername: ownerusername,
            count: count,
        };

        fetch(
            `/emergencyContact/resources/${contactusername}/${resourceType}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(data),
            }
        )
            .then((response) => {
                if (response.ok) {
                    document.getElementById(`${resourceType}-input`).value = "";
                    alert("Resource shared successfully!");
                } else {
                    alert("Failed to share resource: " + response.message);
                }
            })
            .catch((error) => {
                console.error("Error sharing resource:", error);
            });
    }
});
