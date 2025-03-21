function Profile() {
  return <img src="https://i.imgur.com/MK3eW3As.jpg" alt="Katherine Johnson" />;
}

export default function Gallery({ num }) {
  return (
    <section>
      <h1>Amazing scientists: {num}</h1>
      {Array.from({ length: num }, (_, index) => (
        <Profile key={index} />
      ))}
    </section>
  );
}
