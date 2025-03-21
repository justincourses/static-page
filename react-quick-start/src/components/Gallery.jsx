function Profile() {
  return <img src="https://i.imgur.com/MK3eW3As.jpg" alt="Katherine Johnson" />;
}

export default function Gallery({ count }) {
  return (
    <section>
      <h1>Amazing scientists {count}</h1>
      {Array.from({ length: count }, (_, index) => (
        <Profile key={index} />
      ))}
    </section>
  );
}
