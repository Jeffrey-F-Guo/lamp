import './FileUpload.css';
import {useState, useEffect} from 'react';


function FileUpload() {
    const [files, setFiles] = useState<File[]>([])
    useEffect(() => {
        console.log(files)
    }, [files])

    const addFiles = (fileList:FileList) => {
        const newFiles = Array.from(fileList)
        setFiles((curFiles) => [...curFiles, ...newFiles])
        console.log(files)
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
                    Drag and Drop
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

                <div>
                    <button onClick={submitFiles}>
                        Submit
                    </button>
                </div>

            </div>

        </>
    )
}

async function convertHEIC() {

}

export default FileUpload