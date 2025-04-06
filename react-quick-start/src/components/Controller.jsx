export default function Controller({ count, setCount, maxLength }) {
  const handleAdd = () => setCount((count) => count + 1)
  const handleReset = () => setCount(0)

  return (
    <div className="controller-bar">
      <button onClick={handleAdd} disabled={count >= maxLength}>
        count is {count}
      </button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}
