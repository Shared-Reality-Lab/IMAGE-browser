import browser, { Runtime } from "webextension-polyfill";
import { TatStorageData } from "./types";

export function saveToLocalStorage(svgData: string, tatStorageData: TatStorageData, existingTab?: browser.Tabs.Tab) {
    console.log("executingFunction");
    //localStorage.setItem("key", "value");
    const oldValue = localStorage.getItem("svgedit-default");
    localStorage.setItem("svgedit-default", svgData);
    localStorage.setItem("tat-storage-data", JSON.stringify(tatStorageData))
    if (existingTab) {
        dispatchEvent(new StorageEvent("storage", {
            key: "svgedit-default",
            storageArea: localStorage,
            oldValue: oldValue,
            newValue: svgData,
            url: location.href,
        }));
        //location.reload();
    }
}

export function monarchPopUp(id: string, flowType: string) {
    if (flowType == "create") {
        alert(`New channel created with code ${id}`);
    } else {
        alert(`Graphic in channel ${id} has been updated!`)
    }
}

export function Uint8ToString(u8a: any) {
    var CHUNK_SZ = 0x8000;
    var c = [];
    for (var i = 0; i < u8a.length; i += CHUNK_SZ) {
        c.push(String.fromCharCode.apply(null, u8a.subarray(i, i + CHUNK_SZ)));
    }
    return c.join("");
}

export async function encryptData(stringToEncrypt?: string, encryptionKey?: string) {
    //console.log("inside encryptData using encryption key ", encryptionKey);
    const password = encryptionKey;
    // Convert text and password to Uint8Array
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToEncrypt);
    const passwordBuffer = encoder.encode(password);
    // Derive a cryptographic key from the password using PBKDF2
    const salt = crypto.getRandomValues(new Uint8Array(16)); // Use a salt for key derivation
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    const aesKey = await crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: salt,
            iterations: 100000,
            hash: "SHA-256",
        },
        keyMaterial,
        { name: "AES-CBC", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
    // Generate a random IV for encryption
    const iv = crypto.getRandomValues(new Uint8Array(16));
    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-CBC", iv },
        aesKey,
        data
    );
    //svgString = btoa(String.fromCharCode(...new Uint8Array(encryptedData)));
    //const ivBase64 = btoa(String.fromCharCode(...iv));
    //const saltBase64 = btoa(String.fromCharCode(...salt));

    //console.warn(ivBase64)
    //console.warn(saltBase64)
    const encrypted = new Uint8Array(encryptedData)
    const concatenatedArray = new Uint8Array(salt.length + iv.length + encrypted.length);
    concatenatedArray.set(salt, 0);
    concatenatedArray.set(iv, salt.length);
    concatenatedArray.set(encrypted, (salt.length + iv.length))
    stringToEncrypt = btoa(Uint8ToString(concatenatedArray));
    return stringToEncrypt
}


