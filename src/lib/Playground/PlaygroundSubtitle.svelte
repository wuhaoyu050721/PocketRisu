
<script lang="ts">
    import { language } from "src/lang";
    import TextInput from "../UI/GUI/TextInput.svelte";
    import TextAreaInput from "../UI/GUI/TextAreaInput.svelte";
    import Button from "../UI/GUI/Button.svelte";
    import { DBState } from "src/ts/stores.svelte";
    import { getModelInfo, LLMFlags } from "src/ts/model/modellist";
    import { requestChatData } from "src/ts/process/request/request";
    import { asBuffer, selectFileByDom, selectSingleFile, sleep } from "src/ts/util";
    import { alertSelect, notifyError } from "src/ts/alert";
    import { risuChatParser } from "src/ts/parser/parser.svelte";
    import { AppendableBuffer, downloadFile, getLanguageCodes } from "src/ts/globalApi.svelte";
    import SelectInput from "../UI/GUI/SelectInput.svelte";
    import OptionInput from "../UI/GUI/OptionInput.svelte";
    import sendSound from '../../etc/send.mp3'
    import PlaygroundToolFrame from "./PlaygroundToolFrame.svelte";



    let LLMModePrompt ="Transcribe and create a caption and timestamp of it, according to the user's audio or video input. inside a markdown code block. (prefix ```webvtt / postfix ```)\n\nFormat\n```\n[TIME] CONTENT\n```\n\nExample\n```\n[00:00] Hildy!\n[00:01] How are you?\n[00:03] Tell me, is the lord of the universe in?\n[00:07] Somebody must've stolen the crown jewels\n```\n\nStep 2. Generate another subtitle, this time, as a translation to {{slot}}, with same format with Step 1., using step 1 as ref.\n\n The translation must be in natural {{slot}}.\n\n Now, start (Hint: media length is {{slot::time}})"
    let WhisperModePrompt = "```\n{{slot::data}}\n``` Translate the following WEBVTT to natural {{slot}}, with keeping the timestamp and header, inside a markdown code block. (prefix ``` / postfix ```)"

    let selLang = $state(DBState.db.language)
    let prompt = $state(LLMModePrompt)
    let modelInfo = $derived(getModelInfo(DBState.db.aiModel))
    let outputText = $state('')
    let fileB64 = $state('')
    let vttB64 = $state('')
    let vobj:TranscribeObj[] = $state([])
    let mode = $state('llm')
    let sourceLang:string|null = $state(null)    

    async function runLLMMode() {
        outputText = '加载中...\n\n'

        const file = await selectSingleFile([
            'mp3', 'ogg', 'wav', 'flac',
            'mp4', 'webm', 'mkv', 'avi', 'mov'  
        ])

        if(!file){
            outputText = ''
            return
        }

        const videos = [
            'mp4', 'webm', 'mkv', 'avi', 'mov'
        ]

        const ext = file.name.split('.').pop()

        fileB64 = `data:${
            videos.includes(ext) ? 'video' : 'audio'
        }/${ext};base64,${Buffer.from(file.data).toString('base64')}`

        const media = {
            type: videos.includes(ext) ? 'video' : 'audio',
            base64: fileB64,
        } as const

        let time = ''

        if(prompt.includes('{{slot::time}}')){
            const video = document.createElement('video')
            video.src = fileB64
            video.preload = 'metadata'
            video.muted = true
            await video.play()
            const d = video.duration
            console.log(d)
            if(isNaN(d)){
                time = '未知'
            }else{
                time = `${Math.floor(d / 60)}:${Math.floor(d % 60)}`
            }
            video.pause()
            video.remove()
        }

        const v =await requestChatData({
            formated: [{
                role: "user",
                content: risuChatParser(prompt).replace(/{{slot}}/g, selLang).replace(/{{slot::time}}/g, time),
                multimodals: [media]
            }],
            bias: {},
            useStreaming: true
        }, 'model')

        if(v.type === 'multiline'){
            notifyError(v.result[0][1])
            return
        }

        if(v.type !== 'streaming'){
            notifyError(v.result)
            return
        }

        const reader = v.result.getReader()

        while(true){
            const { done, value } = await reader.read()
            if(done){
                break
            }
            const firstKey = Object.keys(value)[0]

            outputText = value[firstKey]
        }

        const extracted = outputText.matchAll(/```(web)?(vtt)?\n(.*?)\n```/gs)

        let latest = ''
        for(const match of extracted){
            latest = match[3].trim()
        }

        vobj = convertTransToObj(latest)
        outputText = makeWebVtt(vobj)
        vttB64 = `data:text/vtt;base64,${Buffer.from(outputText).toString('base64')}`

        const audio = new Audio(sendSound);
        audio.play().catch(() => {});
    }

    async function runWhisperMode() {
        outputText = '加载中...\n\n'

        const files = await selectFileByDom([
            'mp3', 'ogg', 'wav', 'flac',
            'mp4', 'webm', 'mkv', 'avi', 'mov'  

        ])

        const file = files?.[0]

        let requestFile:File = null

        if(!file){
            outputText = ''
            return
        }
        const videos = [
            'mp4', 'webm', 'mkv', 'avi', 'mov'
        ]

        const ext = file.name.split('.').pop()
        if(videos.includes(ext)){
            

            //check duration
            let duration = 0
            {
                const video = document.createElement('video')
                video.src = URL.createObjectURL(file)
                video.preload = 'metadata'
                video.muted = true
                await video.play()
                const d = video.duration
                if(isNaN(d)){
                    notifyError('无法读取该视频的时长')
                    return
                }
                video.pause()
                video.remove()
                duration = d
            }

            outputText = '正在将视频转换为音频...\n\n'
            const audioContext = new AudioContext()
            const audioBuffer = await audioContext.decodeAudioData(await file.arrayBuffer())

            const [left, right] =  [audioBuffer.getChannelData(0), audioBuffer.getChannelData(1)]

            const leftInt16 = new Int16Array(left.length)
            const rightInt16 = new Int16Array(right.length)

            for(let i = 0; i < left.length; i++){
                leftInt16[i] = left[i] * 0x7FFF
                rightInt16[i] = right[i] * 0x7FFF
            }

            const lamejs = await import('@breezystack/lamejs')
            const mp3encoder = new lamejs.Mp3Encoder(2, 44100, 128);
            const enc = new AppendableBuffer()

            for(let pointer = 0; pointer < leftInt16.length; pointer += 1152){
                enc.append(mp3encoder.encodeBuffer(leftInt16.subarray(pointer, pointer + 1152), rightInt16.subarray(pointer, pointer + 1152)))
                if(pointer % 115200 === 0){
                    outputText = `正在将视频转换为音频... ${(pointer / leftInt16.length * 100).toFixed(2)}%\n`
                    await sleep(1)
                }
            }
            enc.append(mp3encoder.flush())

            const file2 = new File([asBuffer(enc.buffer)], 'audio.mp3', {
                type: 'audio/mp3'
            })

            outputText = '正在转录音频...\n\n'
            requestFile = file2
        }
        else{
            requestFile = file
        }


        if(mode === 'whisperLocal'){
            try {
                const {pipeline} = await import('@huggingface/transformers')
                let stats:{
                    [key:string]:{
                        name:string
                        status:string
                        file:string
                        progress?:number
                    }
                } = {}

                const device = ('gpu' in navigator) ? 'webgpu' : 'wasm'

                const transcriber = await pipeline(
                    "automatic-speech-recognition",
                    "onnx-community/whisper-large-v3-turbo_timestamped",
                    {
                        device: device,
                        progress_callback: (progress) => {
                            if ('name' in progress && 'file' in progress) {
                                stats[progress.name + progress.file] = progress
                                outputText = Object.values(stats).map(v => `${v.name}-${v.file}: ${v.status} ${v.progress ? `[${v.progress.toFixed(2)}%]` : ''}`).join('\n')
                            }
                        },
                        dtype: 'q8'
                    },
                );

                const audioContext = new AudioContext()
                const audioBuffer = await audioContext.decodeAudioData(await requestFile.arrayBuffer())
                const combined = new Float32Array(audioBuffer.getChannelData(0).length)
                for(let j = 0; j < audioBuffer.getChannelData(0).length; j++){
                    for(let i = 0; i < audioBuffer.numberOfChannels; i++){
                        combined[j] += audioBuffer.getChannelData(i)[j]
                    }

                    if(combined[j] > 1){
                        combined[j] = 1
                    }
                    if(combined[j] < -1){
                        combined[j] = -1
                    }
                }
                
                outputText = ('正在转录...（可能需要一段时间，请不要关闭页面。）')
                if(device !== 'webgpu'){
                    outputText += `\n当前浏览器或系统不支持 WebGPU，转录速度可能较慢。`
                }
                await sleep(10)
                const res1 = await transcriber(combined, {
                    return_timestamps: true,
                    language: sourceLang,
                })
                const res2 = Array.isArray(res1) ? res1[0] : res1
                const chunks = res2.chunks

                outputText = 'WEBVTT\n\n'

                for(const chunk of chunks){
                    outputText += `${chunk.timestamp[0]} --> ${chunk.timestamp[1]}\n${chunk.text}\n\n`
                }

                console.log(outputText)

            } catch (error) {
                notifyError(JSON.stringify(error))
                outputText = ''
                return
            }
        }
        else{
            const formData = new FormData()
            formData.append('file', requestFile)
            formData.append('model', 'whisper-1')
            formData.append('response_format', 'vtt')


            const d = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DBState.db.openAIKey}`
                },
                body: formData

            })
            outputText = await d.text()
        }


        const v = await requestChatData({
            formated: [{
                role: "user",
                content: risuChatParser(prompt).replace(/{{slot}}/g, selLang).replace(/{{slot::data}}/g, outputText),
            }],
            bias: {},
            useStreaming: true
        }, 'model')


        if(v.type === 'multiline'){
            notifyError(v.result[0][1])
            return
        }

        if(v.type !== 'streaming'){
            notifyError(v.result)
            return
        }

        console.log("Reading...")

        const reader = v.result.getReader()

        while(true){
            const { done, value } = await reader.read()
            if(done){
                break
            }
            const firstKey = Object.keys(value)[0]

            outputText = value[firstKey]
        }
        if(!outputText.trim().endsWith('```')){
            outputText = outputText.trim() + '\n```'
        }

        const extracted = outputText.matchAll(/```(web)?(vtt)?\n(.*?)\n```/gs)

        let latest = ''
        for(const match of extracted){
            latest = match[3].trim()
        }

        const fileBuffer = await file.arrayBuffer()
        outputText = latest
        vttB64 = `data:text/vtt;base64,${Buffer.from(outputText).toString('base64')}`
        fileB64 = `data:audio/wav;base64,${Buffer.from(fileBuffer).toString('base64')}`
        vobj = convertWebVTTtoObj(outputText)

        const audio = new Audio(sendSound);
        audio.play().catch(() => {});
    }

    


    type TranscribeObj = {
        start: string
        end: string
        text: string
    }
    

    function convertTransToObj(r:string){
        const lines = r.split('\n').map(v => v.trim()).filter(v => v)
        const obj:TranscribeObj[] = []
        for(let i = 0; i < lines.length; i++){
            const line = lines[i]
            if(line.startsWith('[')){
                let [time, ...text] = line.split(']')
                time = time.slice(1)
                if(obj.length > 0){
                    obj[obj.length - 1].end = time + '.000'
                }
                obj.push({
                    start: time + '.000',
                    end: '',
                    text: text.join(' ')
                })
            }
        }
        //rediculously long line
        obj[obj.length - 1].end = '99:99.000'
        return obj
    }

    function convertWebVTTtoObj(r:string){
        const chunks = r.split('\n\n').map(v => v.trim()).filter(v => v)
        const obj:TranscribeObj[] = []
        for(const chunk of chunks){
            if(chunk.startsWith('WEBVTT')){
                continue
            }
            const [time, ...text] = chunk.split('\n')
            const [start, end] = time.split(' --> ')
            obj.push({
                start: start,
                end: end,
                text: text.join('\n')
            })
        }
        return obj
    }

    function makeWebVtt(obj: TranscribeObj[]){
        let vtt = 'WEBVTT\n\n'

        for(const line of obj){
            vtt += `${line.start} --> ${line.end}\n${line.text}\n\n`
        }

        return vtt
    }

    function webVttToSrt(){
        const srt = outputText.replace('WEBVTT', '').trim().split('\n\n').map((v, i) => {
            const [time, ...text] = v.split('\n')
            const [start, end] = time.split(' --> ')
            return `${i + 1}\n${start.replace('.', ',')} --> ${end.replace('.', ',')}\n${text.join('\n')}`
        })
        return srt
    }

    type WaveOptions = {
        isFloat: boolean
        numChannels: number
        sampleRate: number
    }
</script>

<PlaygroundToolFrame title={language.subtitles} description="从音频或视频生成字幕，并按目标语言输出可下载文件。">
    <section class="pg-section">
        <span class="pg-section-title">字幕设置</span>

        {#if mode === 'whisperLocal'}
            <span class="pg-section-title">{language.sourceLanguage}</span>
            <SelectInput value={sourceLang === null ? 'auto' : sourceLang}>
                <OptionInput value="auto">自动</OptionInput>
                {#each getLanguageCodes() as lang}
                    <OptionInput value={lang.code}>{lang.name}</OptionInput>
                {/each}
            </SelectInput>
        {/if}

        <span class="pg-section-title">{language.destinationLanguage}</span>
        <TextInput bind:value={selLang} />

        <span class="pg-section-title">{language.type}</span>
        <SelectInput bind:value={mode} onchange={(e) => {
            if(mode === 'llm'){
                prompt = LLMModePrompt
            }
            if(mode === 'whisper' || mode === 'whisperLocal'){
                prompt = WhisperModePrompt
            }
        }}>
            <OptionInput value="llm">LLM</OptionInput>
            <OptionInput value="whisper">Whisper</OptionInput>
            <OptionInput value="whisperLocal">本地 Whisper</OptionInput>
        </SelectInput>

        <span class="pg-section-title">{language.prompt}</span>
        <TextAreaInput bind:value={prompt} />
    </section>

    <section class="pg-section">
        <span class="pg-section-title">运行状态</span>
        {#if !(modelInfo.flags.includes(LLMFlags.hasAudioInput) && modelInfo.flags.includes(LLMFlags.hasVideoInput)) && mode === 'llm'}
            <span class="warning-text">{language.subtitlesWarning1}</span>
        {/if}
        {#if !(modelInfo.flags.includes(LLMFlags.hasStreaming) && DBState.db.useStreaming)}
            <span class="warning-text">{language.subtitlesWarning2}</span>
        {/if}
        {#if !('gpu' in navigator) && mode === 'whisperLocal'}
            <span class="warning-text">{language.noWebGPU}</span>
        {/if}

        {#if !outputText}
            <div class="pg-actions">
                <Button onclick={() => {
                    if(mode === 'llm'){
                        runLLMMode()
                    }
                    if(mode === 'whisper' || mode === 'whisperLocal'){
                        runWhisperMode()
                    }
                }}>
                    {language.run}
                </Button>
            </div>
        {:else if vttB64 && fileB64}
            <details>
                <summary>查看字幕文本</summary>
                <pre class="pg-code">{outputText}</pre>
            </details>
        {:else}
            <pre class="pg-code">{outputText}</pre>
        {/if}
    </section>

    {#if vttB64 && fileB64}
        <section class="pg-section">
            <span class="pg-section-title">预览和下载</span>
            {#key vttB64}
                <video controls src={fileB64} class="video-preview">
                    <track default kind="captions" src={vttB64} srclang="en" />
                </video>
            {/key}

            <div class="pg-actions">
                <Button onclick={() => {
                    outputText = ''
                    fileB64 = ''
                    vttB64 = ''
                }}>
                    {language.reset}
                </Button>

                <Button onclick={async () => {
                    const sel = parseInt(await alertSelect([
                        'WebVTT',
                        'SRT'
                    ]))

                    if(sel === 0){
                        downloadFile('subtitle.vtt', outputText)
                        return
                    }

                    if(sel === 1){
                        downloadFile('subtitle.srt', webVttToSrt().join('\n\n'))
                        return   
                    }
                }}>
                    {language.download}
                </Button>
            </div>
        </section>
    {/if}
</PlaygroundToolFrame>

<style>
    .warning-text {
        color: var(--risu-theme-error, #ff5555);
        line-height: 1.5;
    }

    summary {
        cursor: pointer;
        color: var(--risu-theme-textcolor);
        font-weight: 750;
    }

    .video-preview {
        width: 100%;
        border-radius: 8px;
        border: 1px solid color-mix(in srgb, var(--risu-theme-primary, #3b82f6) 18%, transparent);
        background: black;
    }
</style>
