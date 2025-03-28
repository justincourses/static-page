export default function Controller({ count, setCount, maxLength }) {
  return (
    <div className="controller-bar">
      <button onClick={() => setCount((count) => count + 1)} disabled={count >= maxLength}>
        count is {count}
      </button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
