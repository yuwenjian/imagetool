import React, { useState, useRef, useEffect } from "react";
import { Button, Box, Typography, CircularProgress, Dialog, TextField, DialogActions, DialogContent, DialogTitle, LinearProgress, Alert } from "@mui/material";
import { RemoveCircleOutline, PhotoSizeSelectLarge } from "@mui/icons-material";
import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs';

function App() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [modelReady, setModelReady] = useState(false);
  const [inputKey, setInputKey] = useState(0);
  const fileInput = useRef();
  const netRef = useRef(null);

  // 加载 body-pix 模型
  useEffect(() => {
    let isMounted = true;
    bodyPix.load().then(net => {
      if (isMounted) {
        netRef.current = net;
        setModelReady(true);
      }
    });
    return () => { isMounted = false; };
  }, []);

  // 上传图片
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      alert("仅支持 JPG、PNG、JPEG 格式");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("单个文件最大 10MB");
      return;
    }
    setImage(file);
    setResult(null);
    // 用FileReader读取图片为dataURL
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
    setInputKey(k => k + 1);
  };

  // 使用 body-pix 实现人像抠图
  const handleRemoveBg = async () => {
    if (!image) return;
    if (!modelReady) {
      alert("模型加载中，请稍后再试");
      return;
    }
    setLoading(true);
    // 读取图片为 HTMLImageElement
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const net = netRef.current;
      const segmentation = await net.segmentPerson(img);
      // 创建输出canvas
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length / 4; i++) {
        if (segmentation.data[i] === 0) {
          data[i * 4 + 3] = 0; // 设置为透明
        }
      }
      ctx.putImageData(imageData, 0, 0);
      const url = canvas.toDataURL('image/png');
      setResult(url);
      setLoading(false);
    };
    img.src = preview;
  };

  // 打开调整尺寸对话框
  const handleResizeOpen = () => {
    setResizeOpen(true);
    setResizeWidth("");
    setResizeHeight("");
  };

  // 调整尺寸
  const handleResize = () => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Number(resizeWidth);
      canvas.height = Number(resizeHeight);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        setResult(URL.createObjectURL(blob));
        setPreview(URL.createObjectURL(blob));
        setResizeOpen(false);
      }, "image/png");
    };
    img.src = result || preview;
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", p: 2 }}>
      {/* body-pix 加载进度条和提示 */}
      {!modelReady && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress color="info" />
          <Alert severity="info" sx={{ mt: 1, borderRadius: 2, fontSize: 15, p: 1 }}>
            模型加载中，请耐心等待首次加载（可能需要几十秒）...
          </Alert>
        </Box>
      )}
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <img src="https://dummyimage.com/40x40/eee/666&text=logo" alt="logo" style={{ height: 32, marginRight: 8 }} />
        <Typography variant="h5" fontWeight="bold">图片处理工具</Typography>
      </Box>
      <Box
        sx={{
          border: "2px dashed #b3b3ff",
          borderRadius: 3,
          p: 3,
          mb: 2,
          textAlign: "center",
          bgcolor: "#fafaff"
        }}
        onClick={() => fileInput.current.click()}
      >
        <input
          key={inputKey}
          type="file"
          accept="image/jpeg,image/png,image/jpg"
          style={{ display: "none" }}
          ref={fileInput}
          onChange={handleFileChange}
        />
        <Box sx={{ color: "#5c5cff", fontSize: 48, mb: 1 }}>⬆️</Box>
        <Typography>点击或拖拽上传图片</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          支持 JPG、PNG、JPEG 格式，单个文件最大 10MB
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => fileInput.current.click()}>
          选择图片
        </Button>
      </Box>
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<RemoveCircleOutline />}
          fullWidth
          onClick={handleRemoveBg}
          disabled={!image || loading || !modelReady}
        >
          抠图去背景
        </Button>
        <Button
          variant="contained"
          startIcon={<PhotoSizeSelectLarge />}
          fullWidth
          onClick={handleResizeOpen}
          disabled={!preview && !result}
          sx={{ bgcolor: "#a259ff" }}
        >
          调整尺寸
        </Button>
      </Box>
      <Box sx={{ bgcolor: "#f5f6fa", borderRadius: 2, p: 2, minHeight: 180, mb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          预览区域
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}>
          {(result || preview) ? (
            <img
              src={result || preview}
              alt="预览"
              style={{ maxWidth: "100%", maxHeight: 140, borderRadius: 8, background: "#fff" }}
            />
          ) : (
            <Box sx={{ color: "#bbb", fontSize: 48 }}>🖼️</Box>
          )}
        </Box>
      </Box>
      {/* 导出图片按钮 */}
      <Button
        variant="contained"
        color="success"
        fullWidth
        sx={{ mb: 2, borderRadius: 2 }}
        disabled={!(result || preview)}
        onClick={() => {
          const url = result || preview;
          if (!url) return;
          const a = document.createElement('a');
          a.href = url;
          a.download = 'processed-image.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }}
      >
        导出图片
      </Button>
      {loading && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <CircularProgress size={20} />
          <Typography>等待处理...</Typography>
        </Box>
      )}
      {/* 调整尺寸对话框 */}
      <Dialog open={resizeOpen} onClose={() => setResizeOpen(false)}>
        <DialogTitle>调整图片尺寸</DialogTitle>
        <DialogContent>
          <TextField
            label="宽度(px)"
            type="number"
            value={resizeWidth}
            onChange={e => setResizeWidth(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="高度(px)"
            type="number"
            value={resizeHeight}
            onChange={e => setResizeHeight(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResizeOpen(false)}>取消</Button>
          <Button onClick={handleResize} disabled={!resizeWidth || !resizeHeight}>确定</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App; 