const loadButton = document.getElementById("load-prototype");
const prototypeShell = document.getElementById("prototype-shell");

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

if ("IntersectionObserver" in window && !prefersReducedMotion) {
  document.documentElement.classList.add("motion-ready");

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
  );

  document.querySelectorAll("[data-reveal]").forEach((element) => {
    revealObserver.observe(element);
  });
}

const header = document.querySelector(".site-header");
const updateHeader = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

loadButton.addEventListener("click", () => {
  const frame = document.createElement("iframe");
  frame.title = "Prototype tương tác 3Next";
  frame.src =
    "https://embed.figma.com/proto/4RREZGItQj0N0mV3ZdMH3W/Untitled--Copy-?node-id=22-681&starting-point-node-id=22%3A681&embed-host=3next&scaling=scale-down";
  frame.allowFullscreen = true;
  prototypeShell.replaceChildren(frame);
  frame.focus();
});
