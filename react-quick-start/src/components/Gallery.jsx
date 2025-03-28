import Profile from './Profile';
import Controller from './Controller';
export default function Gallery({ count, setCount }) {
  return (
    <section>
      <h1>Amazing scientists {count}</h1>
      <ul>
        {Array.from({ length: count }, (_, index) => (
          <Profile key={index} />
        ))}
      </ul>
      <Controller count={count} setCount={setCount} />
    </section>
  );
}
