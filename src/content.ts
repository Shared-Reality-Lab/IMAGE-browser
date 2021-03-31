let images = document.getElementsByTagName("img");
for (let image of Array.from(images)) {
    console.debug(image);
    let button = document.createElement("button");
    button.innerText = "Button!";
    button.setAttribute("class", "mwe-button");
    let div = image.closest("div");
    if (div) {
        div.appendChild(button);
    }
}
