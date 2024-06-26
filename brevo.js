const brevo = {
    /** @param {string} subject @param {{email:string,name:string}} sender @param {[{email:string,name:string}]} to @param {string} htmlContent */
    sendEmailAsync: async function(subject, sender, to, htmlContent){
        const apiKey = "";
        let email = {
            "subject": subject,
            "sender" : sender,
            "to" : to,
            "htmlContent" : htmlContent,
        };
        const options = {
            method: 'POST',
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify(email),
        };
        
        let res = await fetch('https://api.brevo.com/v3/smtp/email',options).then(async function(resp){
            return await resp.json();
        }).catch(function(err){
            console.log(err);
            return null;
        });
        return res;
    },
};