import { endSpeedTest } from "./utils/helper.js";
import { initializeSocket } from "./utils/socketUtils.js";
import { verifyTokenAndRedirect } from "./utils/authUtils.js";

document.addEventListener("DOMContentLoaded", function () {
    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");

    // abort controller
    let abortController = null;
    let isRunning = false;

    verifyTokenAndRedirect(token);

    const socket = initializeSocket();

    document
        .getElementById("speed-test-start-button")
        .addEventListener("click", async function (event) {
            event.preventDefault();

            // Create a new AbortController for the speed test
            abortController = new AbortController();
            const signal = abortController.signal;
            isRunning = true;

            const duration = document.getElementById("duration").value;
            const interval = document.getElementById("interval").value;

            console.log(`fecthed duration=${duration}, interval=${interval}`);

            const postDuration = duration / 2;
            const getDuration = duration - postDuration;
            console.log(
                `postduration=${postDuration}, getduration=${getDuration}`
            );
            const postLimit = 1000;
            let postCount = 0;
            let getCount = 0;

            const adminusername = sessionStorage.getItem("username");

            // Start test
            fetch("/start-speed-test", {
                method: "POST",
                signal: signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ adminusername }),
            })
                .then((response) => response.json())
                .then(async () => {
                    const testStart = Date.now();
                    // POST requests
                    const postPromises = [];
                    while (
                        Date.now() - testStart < postDuration * 1000 &&
                        isRunning
                    ) {
                        if (postCount > postLimit) {
                            // If a speed test is running, abort it
                            if (abortController) {
                                abortController.abort(); // This will abort the fetch in start-speed-test
                                abortController = null; // Reset controller for the next start
                            }
                            isRunning = false;
                            endSpeedTest(
                                "Test ended due to exceeding POST limit"
                            );
                            // End test
                            break;
                        }
                        const requestBody = {
                            message: "Test message".padEnd(20, "x"),
                            sender:
                                sessionStorage.getItem("username") ||
                                "Anonymous",
                            status:
                                sessionStorage.getItem("status") || "Undefined",
                        };
                        const postPromise = fetch("/messages", {
                            method: "POST",
                            signal: signal,
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`, // Include the token in the Authorization header
                            },
                            body: JSON.stringify(requestBody),
                        })
                            .then((response) => response.json())
                            .catch((error) =>
                                console.error("Error sending message:", error)
                            );

                        // Add post promise to the array
                        postPromises.push(postPromise);

                        postCount++;
                        await new Promise((resolve) =>
                            setTimeout(resolve, interval)
                        );
                    }

                    // Wait for all POST requests to complete
                    await Promise.all(postPromises);
                    console.log("All POST requests completed.");

                    const currTimeAfterPost = Date.now();
                    // GET requests
                    const getPromises = [];
                    while (
                        Date.now() - currTimeAfterPost < getDuration * 1000 &&
                        isRunning
                    ) {
                        const getPromise = fetch("/messages", {
                            method: "GET",
                            signal: signal,
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`, // Include the token in the Authorization header
                            },
                        })
                            .then((response) => response.json())
                            .then((messages) => {
                                console.log(
                                    "Messages received from server:",
                                    messages
                                );
                            })
                            .catch((error) =>
                                console.error("Error fetching messages:", error)
                            );

                        // Add GET request promise to array
                        getPromises.push(getPromise);

                        getCount++;
                        await new Promise((resolve) =>
                            setTimeout(resolve, interval)
                        );
                    }
                    // Wait for all GET requests to complete
                    await Promise.all(getPromises);

                    const actualDuration = (Date.now() - testStart) / 1000;
                    console.log(
                        `actualduration=${actualDuration} postcount=${postCount} getcount=${getCount}`
                    );

                    if (isRunning) {
                        endSpeedTest(
                            `Actual Duration: ${actualDuration}, PostThroughput: ${
                                postCount / postDuration
                            }/s, getThroughput: ${getCount / getDuration}/s`
                        );
                    }
                })
                .catch((error) => console.error("Error:", error));
        });

    document
        .getElementById("speed-test-stop-button")
        .addEventListener("click", async function (event) {
            event.preventDefault();

            // If a speed test is running, abort it
            if (abortController) {
                abortController.abort(); // This will abort the fetch in start-speed-test
                abortController = null; // Reset controller for the next start
            }

            // Set isRunning to false to break the loops in start-speed-test
            isRunning = false;

            endSpeedTest("Speed test stopped by the user");
        });
});
