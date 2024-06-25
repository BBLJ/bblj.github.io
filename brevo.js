const brevo = {
    /** @param {string} subject @param {{email:string,name:string}} sender @param {[{email:string,name:string}]} to @param {string} htmlContent */
    sendEmailAsync: async function(subject, sender, to, htmlContent){
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
                'api-key': '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'
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