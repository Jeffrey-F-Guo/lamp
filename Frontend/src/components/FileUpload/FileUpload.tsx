import './FileUpload.css';
import {useState, useEffect} from 'react';
import FileThumbnail from './FileThumbnail';

function FileUpload() {
    const [files, setFiles] = useState<Set<File>>(new Set())
    const [previews, setPreviews] = useState<Map<string, string>>(new Map())
    {/*Testing and debugging, can delete later*/}
    useEffect(() => {
        console.log(files, previews)
    }, [files, previews])


    const convertHEIC = async (heicFiles: File[]): Promise<File[]> => {
        console.log(heicFiles)
        return []
    }

    const addFiles = async (fileList:FileList) => {
        const newFiles = Array.from(fileList)
        let heicFiles: File[] = []
        let validFiles: File[] = []
        for (const file of newFiles) {
            if (file.name.toLowerCase().endsWith('.heic')) {
                heicFiles.push(file)
            } else {
                validFiles.push(file)
                const url = URL.createObjectURL(file)
                setPreviews((prev) => new Map(prev).set(file.name, url))
            }
        }
        setFiles((curFiles) => new Set([...curFiles, ...validFiles]))
        if (heicFiles.length > 0) {

            const convertedFiles: File[] = await convertHEIC(heicFiles)
            for (const file of convertedFiles) {
                const url = URL.createObjectURL(file)
                setPreviews((prev) => new Map(prev).set(file.name, url))
            }
            setFiles((curFiles) => new Set([...curFiles, ...convertedFiles]))
        }

        // update map of objectURLs for preview -> conditionally render the previews
        console.log(files)
    }

    const removeFile = () => {
        console.log('removed file')
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files
        if (selectedFiles) {
            addFiles(selectedFiles)
        }
    }
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles) {
            addFiles(droppedFiles); 
        }
            
    }
    const submitFiles = () => {
        // submit files to aws
        console.log("submitted!")
    }

    return (
        <>
            <div className="file-upload-container">
                <p>Please upload a receipt image!</p>

                {/* Make this a cool monster animation to 'eat' the receipts IM COOOKING */}
                <div
                    className="file-upload-box"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                >
                    <p>Drag and Drop</p>
                    <p> or </p>
                    <input
                        type="file"
                        accept="image/*, .pdf"
                        hidden
                        id = "browse"
                        multiple
                        onChange={handleFileChange}
                    />

                    <label className="browse-btn" htmlFor="browse">
                        Browse Files
                    </label>

                </div>

                {files.size > 0 && (
                    <div className='thumbnails-grid'>
                        {Array.from(files).map((file) => (
                            <FileThumbnail
                                key={file.name}
                                file={file}
                                previewUrl={previews.get(file.name) ?? null}
                            />
                        ))}
                    </div>
                )}

                <div>
                    <button>
                        Check My Files
                    </button>
                    <button onClick={submitFiles}>
                        Submit
                    </button>
                </div>
            </div>
        </>
    )
}

export default FileUpload