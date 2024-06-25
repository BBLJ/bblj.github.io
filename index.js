/// <reference path="sdk.js"/>
window.addEventListener("DOMContentLoaded", main);

let isInLIFF = false;
const txtResult = document.getElementById("txtResult");

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
    if(isInLIFF){
        let userProfile = liff.getProfile();
        console.log(userProfile);
    } else {
        console.log("not in LIFF");
    }
};
