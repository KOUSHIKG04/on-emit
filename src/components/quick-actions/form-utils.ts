const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseEmailList(value: string) {
  const emails = [
    ...new Set(
      value
        .split(/[,;\n]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return {
    emails,
    invalid: emails.filter((email) => !emailPattern.test(email)),
  };
}
