const LILIES = [
  {
    src: "/Lirio3.png",
    left: "2%",
    top: "7%",
    size: 84,
    rotate: -24,
    opacity: 0.3,
    delay: "0s",
    duration: "9s",
  },
  {
    src: "/Lirio5.png",
    right: "4%",
    top: "13%",
    size: 100,
    rotate: 28,
    opacity: 0.32,
    delay: "1.2s",
    duration: "11s",
  },
  {
    src: "/Lirio1.png",
    left: "6%",
    top: "40%",
    size: 70,
    rotate: 14,
    opacity: 0.22,
    delay: "2.4s",
    duration: "10s",
  },
  {
    src: "/Lirio6.png",
    right: "3%",
    top: "46%",
    size: 92,
    rotate: -18,
    opacity: 0.26,
    delay: "0.8s",
    duration: "12s",
  },
  {
    src: "/Lirio2.png",
    left: "9%",
    bottom: "9%",
    size: 80,
    rotate: 38,
    opacity: 0.28,
    delay: "1.8s",
    duration: "9.5s",
  },
  {
    src: "/Lirio4.png",
    right: "8%",
    bottom: "6%",
    size: 108,
    rotate: -32,
    opacity: 0.3,
    delay: "3s",
    duration: "11.5s",
  },
];

export default function FloatingLilies() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[3] overflow-hidden"
    >
      {LILIES.map((lily, i) => (
        <div
          key={i}
          className="absolute select-none"
          style={{
            left: lily.left,
            top: lily.top,
            right: lily.right,
            bottom: lily.bottom,
            width: lily.size,
            height: lily.size,
            transform: `rotate(${lily.rotate}deg)`,
            opacity: lily.opacity,
            filter: "drop-shadow(0 0 10px rgba(246,228,168,0.18))",
          }}
        >
          <img
            src={lily.src}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
            style={{
              animation: `lily-float ${lily.duration} ease-in-out ${lily.delay} infinite`,
            }}
          />
        </div>
      ))}
    </div>
  );
}