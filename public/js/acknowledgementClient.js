document.addEventListener("DOMContentLoaded", function () {
    const agreementForm = document.getElementById("agreement-section");

    const username = sessionStorage.getItem('username');
    const password = sessionStorage.getItem('password');

    if (!username || !password) {
        console.error('Username or password not found in session storage');
        window.location.href = '/join_page';
    }


    agreementForm.addEventListener("submit", function (event) {
        event.preventDefault();
        performSubmission();
    });

    //utility function to show error message
    function errorMessagePopup(message) {
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: message,
        }).then(() => {
            window.location.href = "/join_page";
        });
    }

    function performSubmission() {
        const username = sessionStorage.getItem("username");
        const password = sessionStorage.getItem("password");

        const requestBody = {
            username: username,
            password: password,
        };

        console.log(
            "User agrees to the terms and conditions."
        );
        fetch(`/users/${username}/acknowledgement`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })
            .then(async (response) => {
                const res = await response.json();
                if (response.ok) {
                    // Successful registration
                    sessionStorage.setItem("token", res.token);
                    window.location.href = "/home";
                } else {
                    // Handle the error response
                    const errorData = await response.json();
                    console.error("acknowledgeUser failed", errorData.message);
                    errorMessagePopup(`Error: ${errorData.message}`);
                    window.location.href = "/new_user_acknowledge_page";
                }
            })

            .catch((error) => {
                console.error("Fetch failed", error);
            });
        


    }
});
