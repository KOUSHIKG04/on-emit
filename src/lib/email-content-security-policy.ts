export const EMAIL_IMAGE_SOURCE_DIRECTIVE = "img-src data:;";

const imageSourceDirectivePattern = /\bimg-src(?:\s+([^;]*))?;/i;

export function allowRemoteEmailImageSources(document: string) {
  return document.replace(
    imageSourceDirectivePattern,
    (_directive, sources: string | undefined) => {
      const sourceList = (sources ?? "").split(/\s+/).filter(Boolean);

      for (const source of ["https:", "http:"]) {
        if (!sourceList.includes(source)) sourceList.push(source);
      }

      return `img-src ${sourceList.join(" ")};`;
    },
  );
}
