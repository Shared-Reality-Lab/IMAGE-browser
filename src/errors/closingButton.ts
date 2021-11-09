window.onload = function() {
const closeButton : Element | null = document.getElementById('closing-button');
closeButton?.addEventListener("click", () => window.close());
}
