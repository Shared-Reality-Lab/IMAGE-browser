let encodedRenderings = window.location.search.substring(1);
let renderings = JSON.parse(decodeURIComponent(encodedRenderings));
console.debug(renderings);

for (let rendering of renderings["renderings"]) {
    let section = document.createElement("section");
    document.body.append(section);
    let header = document.createElement("h2");
    header.textContent = rendering["text_string"];
    section.append(header);
    let details = rendering["metadata"]["more_details_rendering"];
    if (details["metadata"]["type_id"] === "c640f825-6192-44ce-b1e4-dd52e6ce6c63") {
        // Audio/Haptic
        let div = document.createElement("div");
        section.append(div);
        if (details["metadata"]["description"]) {
            let p = document.createElement("p");
            p.textContent = details["metadata"]["description"];
            div.append(p);
        }
        if (details["audio_url"]) {
            let audio = document.createElement("audio");
            audio.setAttribute("controls", "");
            audio.setAttribute("src", details["audio_url"]);
            div.append(audio);
        }
    }
}
