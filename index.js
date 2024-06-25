/// <reference path="sdk.js"/>
window.addEventListener("DOMContentLoaded", main);

let isInLIFF = false;
const txtResult = document.getElementById("txtResult");
const txtErrMsg = document.getElementById("txtErrMsg");

function main(){
    // Using a Promise object
    liff.init({
        liffId: "2005691529-5yxwlPkP", // Use own liffId
    }).then(function(){
        isInLIFF = true;
    }).catch(function(err){
        console.log(err);
    });
};

function showUserProfile(){
    txtResult.value = "";
    try {
        if(isInLIFF){
            liff.getProfile().then(function(userProfile){
                txtResult.value = userProfile.displayName;
            });
        } else {
            txtResult.value = "isInLIFF==false";
        }
    } catch (ex) {
        txtResult.value = ex;
    }
};

function sendMessage(){
    txtErrMsg.value = "";
    try {
        liff.sendMessages([
            {
                type: "text",
                text: "Hello, World!",
            },
        ]).then(() => {
            txtErrMsg.value = "message sent!";
        }).catch((err) => {
            txtErrMsg.value = err;
        });
    } catch (ex){
        txtErrMsg.value = ex;
    }
};
