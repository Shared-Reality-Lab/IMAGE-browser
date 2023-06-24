
function processGraphics() {
    console.debug("inside screenreader script");
    let images = document.getElementsByTagName("img");
    /** add a button below each image - visible to screen reader only */
    for(let image of images){
      let button = document.createElement("button");
      button.innerText = "Interpret graphic with IMAGE";
      /** add styles to button to make it visible to only screen reader */
      button.classList.add("sr-only");
      button.addEventListener("click", function(){
        let imageData = {
          "naturalWidth": image.naturalWidth,
          "naturalHeight": image.naturalHeight,
          "sourceURL": image.currentSrc
        }
        messageObj = { "messageFrom": "screenReaderGraphic", "imageData": imageData };
        window.postMessage(messageObj, "*");
      })
      image.parentNode.insertBefore(button, image.nextSibling);
    }
  }
  
  document.onreadystatechange = function () {
    if (document.readyState === 'complete') {
      setTimeout(processGraphics, 1000);
    }
  }