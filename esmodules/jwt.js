export class JWT{
    test(){
        console.log('test-----------------------------------------------------------------test')
    }

    async sign(header, data, secret){
        const encodedHeader = this.base64url_encode(header);
        const encodedData = this.base64url_encode(data);
        var token = encodedHeader + "." + encodedData;

        "use strict";

            const enc = new TextEncoder();
            const body = token;
            const algorithm = { name: "HMAC", hash: "SHA-256" };

            const key = await crypto.subtle.importKey(
                "raw",
                enc.encode(secret),
                algorithm,
                false,
                ["sign", "verify"]
            );

            const signature = await crypto.subtle.sign(
                algorithm.name,
                key,
                enc.encode(body)
                
            );
            
            return token + "." + this.base64url_encode(signature);
    }

    /*
    * JavaScript base64 / base64url encoder and decoder
    */

    b64c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";   // base64 dictionary
    b64u = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";  // base64url dictionary
    b64pad = '=';

    /* base64_encode_data
    * Internal helper to encode data to base64 using specified dictionary.
    */
    base64_encode_data(data, len, b64x) {
        var dst = ""
        var i

        for (i = 0; i <= len - 3; i += 3)
        {
            dst += b64x.charAt(data.charCodeAt(i) >>> 2)
            dst += b64x.charAt(((data.charCodeAt(i) & 3) << 4) | (data.charCodeAt(i+1) >>> 4))
            dst += b64x.charAt(((data.charCodeAt(i+1) & 15) << 2) | (data.charCodeAt(i+2) >>> 6))
            dst += b64x.charAt(data.charCodeAt(i+2) & 63)
        }

        if (len % 3 == 2)
        {
            dst += b64x.charAt(data.charCodeAt(i) >>> 2)
            dst += b64x.charAt(((data.charCodeAt(i) & 3) << 4) | (data.charCodeAt(i+1) >>> 4))
            dst += b64x.charAt(((data.charCodeAt(i+1) & 15) << 2))
            dst += this.b64pad
        }
        else if (len % 3 == 1)
        {
            dst += b64x.charAt(data.charCodeAt(i) >>> 2)
            dst += b64x.charAt(((data.charCodeAt(i) & 3) << 4))
            dst += this.b64pad
            dst += this.b64pad
        }

        return dst
    }

    /* base64_encode
    * Encode a JavaScript string to base64.
    * Specified string is first converted from JavaScript UCS-2 to UTF-8.
    */
    base64_encode(str) {
        var utf8str = unescape(encodeURIComponent(str))
        return this.base64_encode_data(utf8str, utf8str.length, this.b64c)
    }

    base64url_encode(buffer) {
        return btoa(Array.from(new Uint8Array(buffer), b => String.fromCharCode(b)).join(''))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    
    base64url_decode() {
        var m = value.length % 4;
        return Uint8Array.from(atob(
            value.replace(/-/g, '+')
                .replace(/_/g, '/')
                .padEnd(value.length + (m === 0 ? 0 : 4 - m), '=')
        ), c => c.charCodeAt(0)).buffer
    }

    /* base64_charIndex
    * Internal helper to translate a base64 character to its integer index.
    */
    base64_charIndex(c) {
        if (c == "+") return 62
        if (c == "/") return 63
        return b64u.indexOf(c)
    }

    /* base64_decode
    * Decode a base64 or base64url string to a JavaScript string.
    * Input is assumed to be a base64/base64url encoded UTF-8 string.
    * Returned result is a JavaScript (UCS-2) string.
    */
    base64_decode(data) {
        var dst = ""
        var i, a, b, c, d, z
        
        for (i = 0; i < data.length - 3; i += 4) {
            a = this.base64_charIndex(data.charAt(i+0))
            b = this.base64_charIndex(data.charAt(i+1))
            c = this.base64_charIndex(data.charAt(i+2))
            d = this.base64_charIndex(data.charAt(i+3))

            dst += String.fromCharCode((a << 2) | (b >>> 4))
            if (data.charAt(i+2) != b64pad)
                dst += String.fromCharCode(((b << 4) & 0xF0) | ((c >>> 2) & 0x0F))
            if (data.charAt(i+3) != b64pad)
                dst += String.fromCharCode(((c << 6) & 0xC0) | d)
        }

        dst = decodeURIComponent(escape(dst))
        return dst
    }

    /* base64url_sniff
    * Check whether specified base64 string contains base64url specific characters.
    * Return true if specified string is base64url encoded, false otherwise.
    */
    base64url_sniff(base64) {
        if (base64.indexOf("-") >= 0) return true
        if (base64.indexOf("_") >= 0) return true
        return false
    }

}