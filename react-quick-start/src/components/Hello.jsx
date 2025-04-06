import { useEffect } from 'react'
import { useImmer } from "use-immer";

export default function Hello({ count }) {
  const [val, setVal] = useImmer({
    count: null,
  })

  const sum = val.count + count

  useEffect(() => {
    setVal((draft) => {
      draft.count = count;
    });
  }, [count, setVal]);

  const handleAlert = (num) => {
    return () => {
      alert(num)
    }
  }

  return (
    <>
      <h1>Hello React {val.count}</h1>
      <p>Out: {count}</p>
      <p>In: {val.count}</p>
      <p>Sum: {sum}</p>
      <button
        onClick={() =>
          setVal((draft) => {
            draft.count = draft.count + 1;
          })
        }
      >
        Add
      </button>
      <button onClick={handleAlert(val.count)}>Subtract</button>
    </>
  );
}
