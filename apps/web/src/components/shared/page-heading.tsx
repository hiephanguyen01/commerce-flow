type PageHeadingProps = {
  title: string;
  description?: string;
};

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <header>
      <h1>{title}</h1>

      {description ? <p>{description}</p> : null}
    </header>
  );
}
