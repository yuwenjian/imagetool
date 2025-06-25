import React, { useState, useRef, useEffect } from "react";
import { Upload, Button, Image, Spin, message, Card, Row, Col, Space, Typography } from "antd";
import { UploadOutlined, ScissorOutlined, DownloadOutlined } from "@ant-design/icons";
import * as bodyPix from '@tensorflow-models/body-pix';
import '@tensorflow/tfjs';

const { Title } = Typography;

function App() {
  const [fileList, setFileList] = useState([]);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const netRef = useRef(null);

  useEffect(() => {
    bodyPix.load().then(net => {
      netRef.current = net;
      setModelReady(true);
    });
  }, []);

  const handlePreview = async file => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreview(file.url || file.preview);
    setResult(null);
  };

  const handleChange = async ({ fileList: newFileList }) => {
    setFileList(newFileList);
    if (newFileList.length > 0) {
      const file = newFileList[0].originFileObj;
      const base64 = await getBase64(file);
      setPreview(base64);
      setResult(null);
    } else {
      setPreview(null);
      setResult(null);
    }
  };

  const getBase64 = file =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });

  const handleRemoveBg = async () => {
    if (!preview || !modelReady) {
      message.warning("请先上传图片并等待模型加载完成");
      return;
    }
    setLoading(true);
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      const net = netRef.current;
      const segmentation = await net.segmentPerson(img);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length / 4; i++) {
        if (segmentation.data[i] === 0) {
          data[i * 4 + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setResult(canvas.toDataURL('image/png'));
      setLoading(false);
    };
    img.src = preview;
  };

  const handleExport = () => {
    const url = result || preview;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed-image.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f6f7fb",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <Card style={{ width: 420, padding: 24, borderRadius: 16, boxShadow: "0 4px 24px #0001" }}>
        <Title level={3} style={{ textAlign: "center", marginBottom: 32 }}>图片处理工具</Title>
        <Row justify="center">
          <Col>
            <Upload
              accept="image/jpeg,image/png,image/jpg"
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onPreview={handlePreview}
              onChange={handleChange}
              maxCount={1}
              style={{ marginBottom: 16 }}
            >
              {fileList.length >= 1 ? null : <div><UploadOutlined /> 上传图片</div>}
            </Upload>
          </Col>
        </Row>
        <Space style={{ width: "100%", justifyContent: "center", margin: "16px 0" }}>
          <Button
            type="primary"
            icon={<ScissorOutlined />}
            onClick={handleRemoveBg}
            disabled={!preview || loading || !modelReady}
          >
            抠图去背景
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!(result || preview)}
          >
            导出图片
          </Button>
        </Space>
        <Card
          style={{
            background: "#f5f6fa",
            borderRadius: 8,
            padding: 16,
            minHeight: 220,
            marginTop: 8,
            textAlign: "center"
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ marginBottom: 8, textAlign: "left", color: "#888" }}>预览区域</div>
          {loading ? (
            <Spin />
          ) : (
            (result || preview) ? (
              <Image
                src={result || preview}
                alt="预览"
                style={{ maxWidth: 320, maxHeight: 180, borderRadius: 8, background: "#fff" }}
                fallback=""
                preview={false}
              />
            ) : (
              <div style={{ color: "#bbb", fontSize: 48, marginTop: 32 }}>🖼️</div>
            )
          )}
        </Card>
      </Card>
    </div>
  );
}

export default App;