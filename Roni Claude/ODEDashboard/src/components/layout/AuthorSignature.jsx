/**
 * AuthorSignature — small "created by" watermark fixed to the bottom-end corner.
 * Strict B&W per Oded Creative design rules: muted gray prefix in Heebo,
 * handwritten name in Caveat, no color accents, hidden on print.
 */
export default function AuthorSignature() {
  return (
    <div className="author-signature" aria-hidden="true">
      <span className="sig-prefix">created by</span>
      <span className="sig-name">Dr Roni Gershonovitch</span>
    </div>
  )
}
