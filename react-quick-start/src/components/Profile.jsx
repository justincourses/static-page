export default function Profile({ idx, user }) {
  const { name, image } = user;

  return (
    <li className="gallery-avatar">
      <img src={image} />
      <h3>{idx + 1}: {name} {idx%2 === 0 ? '😊' : '😭'}</h3>
    </li>
  );
}
