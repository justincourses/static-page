import { useEffect, useReducer } from 'react'
import { useImmer } from "use-immer";
import NumProvider from '../providers/num';

const sumReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_SUM':
      return state + action.payload.count;
    case 'CALCULATE_SUM':
      return action.payload.valCount + action.payload.count;
    case 'RESET_SUM':
      return 0;
    case 'SUBTRACT_SUM':
      return state - action.payload.count;
    default:
      return state;
  }
};

export default function Hello({ count }) {
  const [val, setVal] = useImmer({
    count: null,
  })

  const [sum, dispatchSum] = useReducer(sumReducer, 0);

  useEffect(() => {
    setVal((draft) => {
      draft.count = count;
    });
    dispatchSum({
      type: 'CALCULATE_SUM',
      payload: { valCount: val.count, count }
    });
  }, [count, setVal, val.count]);

  const handleAlert = (num) => {
    return () => {
      alert(num)
    }
  }

  return (
    <>
      <h1>Greeting React {val.count}</h1>
      <p>Out: {count}</p>
      <p>In: {val.count}</p>
      <p>Sum: {sum}</p>
      <NumProvider num={1}>ContextNum</NumProvider>
      <NumProvider num={2}>ContextNum</NumProvider>
      <NumProvider num={3}>ContextNum</NumProvider>
      <NumProvider num={4}>ContextNum</NumProvider>
      <NumProvider num={5}>ContextNum</NumProvider>
      <NumProvider num={6}>ContextNum</NumProvider>
      <button
        onClick={() => dispatchSum({ type: 'ADD_SUM', payload: { count } })}
      >
        Add
      </button>
      <button onClick={handleAlert(val.count)}>Subtract</button>
      <button onClick={() => dispatchSum({ type: 'RESET_SUM' })}>Reset</button>
      <button onClick={() => dispatchSum({ type: 'SUBTRACT_SUM', payload: { count: 1 } })}>Subtract</button>
    </>
  );
}
