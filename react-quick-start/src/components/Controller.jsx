export default function Controller({ count, setCount }) {
  return (
    <div className="controller-bar">
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}
