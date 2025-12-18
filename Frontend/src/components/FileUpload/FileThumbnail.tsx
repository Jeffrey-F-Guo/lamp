import './FileThumbnail.css'
interface FileThumbnailProps {
    file: File
    previewUrl: string | null

}

function FileThumbnail({file, previewUrl}: FileThumbnailProps) {
    return (
        <div className="thumbnail-item">
            {previewUrl ? (
                <img
                    src = {previewUrl}
                    alt = {file.name}
                    className="thumbnail-image"
                />
            ) : (
                <div className="thumbnail-placeholder">
                    <span>📄</span>
                </div>
            )}
            <button>x</button>
            <div className="thumbnail-name">
                {file.name}
            </div>
        </div>
    )
}

export default FileThumbnail