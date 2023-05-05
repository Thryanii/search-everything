const request = require('request');

const normal = (url, options, cookies) => {
    return new Promise((resolve, reject) => {
        let defaultOptions = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 Edg/112.0.1722.68"
            }
        }
        options = options || defaultOptions
        if (cookies != undefined) options.headers['Cookie'] = cookies
        request.get(encodeURI(url), options, (error, response, body) => {
            if (error) {
                reject(error)
            } else if (response.statusCode !== 200) {
                reject(response)
            } else {
                cookies = cookies || false
                if (cookies) resolve([body, response.headers['set-cookie']])
                else resolve(body)
            }
        });
    });
}

const withCookies = (url, options) => {
    return new Promise((resolve, reject) => {
        const defaultOptions = {
            headers: {
                "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36 Edg/112.0.1722.68"
            }
        }
        options = options || defaultOptions
        request.get(encodeURI(url), options, (error, response, body) => {
            if (error) {
                reject(error)
            } else if (response.statusCode !== 200) {
                reject(response)
            } else {
                resolve(response.headers['set-cookie'])
            }
        });
    });
}

module.exports = {normal,withCookies}