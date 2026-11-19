const loadButton = document.getElementById("load-prototype");
const prototypeShell = document.getElementById("prototype-shell");

loadButton.addEventListener("click", () => {
  const frame = document.createElement("iframe");
  frame.title = "Prototype tương tác 3Next";
  frame.src =
    "https://embed.figma.com/proto/4RREZGItQj0N0mV3ZdMH3W/Untitled--Copy-?node-id=22-681&starting-point-node-id=22%3A681&embed-host=3next&scaling=scale-down";
  frame.allowFullscreen = true;
  prototypeShell.replaceChildren(frame);
  frame.focus();
});
