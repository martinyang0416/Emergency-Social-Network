import { initializeSocket } from "./utils/socketUtils.js";

document.addEventListener("DOMContentLoaded", function () {

    const socket = initializeSocket();
    socket.on("request sent", function () {
        showNewRequestPopup();
    });

    socket.on("request approved", (data) => {
        Swal.fire({
            title: 'Request Approved!',
            text: `Your request for ${data.quantity} ${data.resourceType} was approved by ${data.approvedBy}.`,
            icon: 'success',
            confirmButtonText: 'OK'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/manageResources';
            }
        });
    });

    socket.on("request rejected", (data) => {
        Swal.fire({
            title: 'Request rejected!',
            text: `Your request for was rejected by ${data.rejectedBy}.`,
            icon: 'failure',
            confirmButtonText: 'OK'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = '/manageResources';
            }
        });
    });

    socket.on("request denied", function (data) {
        Swal.fire({
            title: 'Request Denied',
            text: `${data.reason}`,
            icon: 'error',
            confirmButtonText: 'OK',
        });
    });
    

    fetch("/resourcesHeader.html")
        .then((response) => response.text())
        .then((data) => {
            document.body.insertAdjacentHTML("afterbegin", data);
        })
        .catch((error) => {
            console.error("Error loading header:", error);
        });

        function showNewRequestPopup() {
            Swal.fire({
                title: 'New Resource Request Received!',
                text: 'You have a new resource request. Please check your requests.',
                icon: 'info',
                confirmButtonText: 'View Requests'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.location.href = '/manageResources'; 
                }
            });
        }

});
