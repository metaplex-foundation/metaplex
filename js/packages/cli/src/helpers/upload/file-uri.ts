/**
 * The Manifest object for a given asset.
 * This object holds the contents of the asset's JSON file.
 * Represented here in its minimal form.
 */
type Manifest = {
  name: string;
  image: string;
  animation_url: string;
  properties: {
    files: Array<{ type: string; uri: string }>;
  };
};

/**
 * Set an asset's manifest from the filesystem & update it with the link
 * to the asset's image/animation link, obtained from signing the asset image/animation DataItem.
 *  Original function getUpdatedManifest from arweave-bundle
 */
export async function setImageUrlManifest(
  manifestString: string,
  imageLink: string,
  animationLink: string,
): Promise<Manifest> {
  const manifest: Manifest = JSON.parse(manifestString);
  const originalImage = manifest.image;
  manifest.image = imageLink;
  manifest.properties.files.forEach(file => {
    if (file.uri === originalImage) file.uri = imageLink;
  });
  if (animationLink) {
    manifest.animation_url = animationLink;
  }
  return manifest;
}
