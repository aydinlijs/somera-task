import "./App.css";
import { Table, Space, Form, Input, Popover, Button, Row, Col } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import { useEffect, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import "antd/dist/antd.css";

const spec_symbols = [
  { value: " ", margin: 0 },
  { value: ",", margin: 2 },
  { value: ".", margin: 2 },
  { value: "!", margin: 2 },
  { value: "?", margin: 2 },
  { value: "(", margin: 1 },
  { value: ")", margin: 2 },
  { value: "[", margin: 1 },
  { value: "]", margin: 2 },
  //more can be added proper to language specifications
];
const getItemStyle = (isDragging, draggableStyle) => ({
  // some basic styles to make the items look a bit nicer
  userSelect: "none",
  // change background colour if dragging
  background: isDragging ? "lightgreen" : "grey",
  // styles we need to apply on draggables
  ...draggableStyle,
});

const getListStyle = (isDraggingOver) => ({
  background: isDraggingOver ? "lightblue" : "lightgrey",
  display: "flex",
  flexWrap: "wrap",
  overflow: "auto",
});
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const App = () => {
  const [parts, setParts] = useState([]);
  const [sentences, setSentences] = useState([]);
  const [editing, setEditing] = useState(null);
  const [mouseIn, setMouseIn] = useState(null);
  const [ids, setIds] = useState([]);

  const [replacement] = Form.useForm();
  const [editor] = Form.useForm();

  const refContainer = useRef(null);

  useEffect(() => {
    if (localStorage.getItem("sentences")) {
      let old_sentences = JSON.parse(localStorage.getItem("sentences"));
      setSentences(old_sentences);
    }
  }, []);

  const generateId = (prevs) => {
    if (!prevs.length) {
      return "1";
    }
    let max = Math.max(...prevs.map((id) => +id));
    return (max + 1).toString();
  };

  //sentences table columns
  const columns = [
    {
      title: "Sentence",
      dataIndex: "sentence",
      key: "sentence",
    },
    {
      title: "Edit",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => editASentence(record)} type="success">
            Edit
          </Button>
        </Space>
      ),
    },
    {
      title: "Delete",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => deleteASentence(record)} type="danger">
            Delete
          </Button>
        </Space>
      ),
    },
    {
      title: "New sentence",
      key: "action",
      render: (record) => (
        <Space size="middle">
          <Button onClick={() => formSentence(record)} type="primary">
            Form sentence
          </Button>
        </Space>
      ),
    },
  ];

  //generates a sentence from spintax template
  const formSentence = (text) => {
    text = text.sentence;
    var matches, options, random;

    var regEx = new RegExp(/{([^{}]+?)}/);

    while ((matches = regEx.exec(text)) !== null) {
      options = matches[1].split("|");
      random = Math.floor(Math.random() * options.length);
      text = text.replace(matches[0], options[random]);
    }

    alert(text);
  };

  //to delete a sentence block
  const deleteASentence = (record) => {
    setSentences(sentences.filter((s) => s.key !== record.key));
  };

  //to delete a sentence block
  const editASentence = (record) => {
    setEditing(record.key);
    setParts(sentences.find((s) => s.key === record.key).parts);
  };

  //to save a word block
  const saveWordBlock = (values) => {
    let parts_copy = [...parts].concat(handleSpecialCharacters(values.editor));
    setParts(parts_copy);

    editor.resetFields();
    refContainer.current.focus();
  };

  //carrying special characters out of word blocks
  const handleSpecialCharacters = (block) => {
    let ids_array = [...ids];
    if (block.length === 1) {
      let id = generateId(ids_array);
      ids_array.push(id);
      setIds(ids_array);
      let isspec = spec_symbols.map((s) => s.value).includes(block);
      return [
        {
          value: isspec ? block : [block],
          isspec,
          id,
        },
      ];
    }
    let start_parts = [];
    let end_parts = [];
    let dontleave = false;
    for (let i = 0; i < block.length; i++) {
      if (spec_symbols.map((s) => s.value).includes(block[i])) {
        let id = generateId(ids_array);
        ids_array.push(id);
        start_parts.push({
          value: block[i],
          isspec: true,
          id,
        });
      } else {
        block = block.substr(i);
        dontleave = true;
        break;
      }
    }
    if (dontleave) {
      for (let j = block.length - 1; j > -1; j--) {
        let id = generateId(ids_array);
        ids_array.push(id);
        if (spec_symbols.map((s) => s.value).includes(block[j])) {
          end_parts.unshift({
            value: block[j],
            isspec: true,
            id,
          });
        } else {
          end_parts.unshift({
            value: [block.substring(0, j + 1)],
            isspec: false,
            id,
          });
          break;
        }
      }
    }
    setIds(ids_array);
    return start_parts.concat(end_parts);
  };

  //removing word blocks
  const handleBlockDelete = (index) => {
    setParts(parts.filter((p, i) => i !== index));
  };

  //removing words inside word blocks
  const handleInnerWordBlockDelete = (index, index2) => {
    if (parts[index].value.length > 1) {
      let new_parts = [...parts];
      new_parts[index].value.splice(index2, 1);
      setParts(new_parts);
    } else {
      handleBlockDelete(index);
    }
  };

  //to save the replacement of a word
  const handleReplacementSave = (e) => {
    let new_parts = [...parts];
    new_parts[mouseIn].value.push(e.replacement);
    replacement.resetFields();
    setParts(new_parts);
  };

  //to save the formed sentence
  const saveSentence = () => {
    let new_sentences = [...sentences];
    let sentence = "";
    parts.forEach((part) => {
      if (part.isspec) {
        sentence += part.value;
      } else {
        if (part.value.length > 1) {
          sentence += "{";
          part.value.forEach((v, i) => {
            sentence += v;
            if (i !== part.value.length - 1) {
              sentence += "|";
            }
          });
          sentence += "}";
        } else {
          sentence += part.value[0];
        }
      }
    });
    if (editing) {
      new_sentences.find((s) => s.key === editing).parts = parts;
      new_sentences.find((s) => s.key === editing).sentence = sentence;
    } else {
      new_sentences.push({ parts, sentence, key: sentences.length + 1 });
    }
    setSentences(new_sentences);
    localStorage.setItem("sentences", JSON.stringify(new_sentences));
    resetEditor();
  };

  //reseting sentence editor
  const resetEditor = () => {
    setEditing(null);
    setParts([]);
    editor.resetFields();
  };

  //keeps track of active word block
  const mouseEnteredToTheBlock = (index) => {
    setMouseIn(index);
  };
  const onDragEnd = (result) => {
    // dropped outside the list
    if (!result.destination) {
      return;
    }

    const items = reorder(parts, result.source.index, result.destination.index);

    setParts(items);
  };

  return (
    <div className="app container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <div className="mt-10 mb-20 align-blocks">
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="droppable" direction="horizontal">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    style={getListStyle(snapshot.isDraggingOver)}
                    {...provided.droppableProps}
                  >
                    {parts.map((p, index) => {
                      return !p.isspec ? (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={getItemStyle(
                                snapshot.isDragging,
                                provided.draggableProps.style
                              )}
                            >
                              <Popover
                                key={index}
                                title={"Add new replacement"}
                                content={() => {
                                  return (
                                    <Form
                                      form={replacement}
                                      onFinish={(e) => handleReplacementSave(e)}
                                    >
                                      <Form.Item
                                        name="replacement"
                                        rules={[
                                          {
                                            required: true,
                                            message:
                                              "Please input a replacement!",
                                          },
                                        ]}
                                      >
                                        <Input
                                          id={`replacement${index}`}
                                          placeholder="New replacement"
                                        />
                                      </Form.Item>
                                      <Button htmlType="submit" type="primary">
                                        Save
                                      </Button>
                                    </Form>
                                  );
                                }}
                              >
                                <p
                                  onMouseEnter={() =>
                                    mouseEnteredToTheBlock(index)
                                  }
                                  className={`custom_tag ${
                                    p.value.length > 1 ? "multi" : ""
                                  }`}
                                >
                                  {p.value.map((v, index2) => {
                                    return (
                                      <span key={index2}>
                                        <span>{v}</span>
                                        <CloseOutlined
                                          onClick={() =>
                                            handleInnerWordBlockDelete(
                                              index,
                                              index2
                                            )
                                          }
                                        />
                                        {index2 !== p.value.length - 1 ? (
                                          <span className="line_btw">|</span>
                                        ) : (
                                          ""
                                        )}
                                      </span>
                                    );
                                  })}
                                </p>
                              </Popover>
                            </div>
                          )}
                        </Draggable>
                      ) : (
                        <Draggable key={p.id} draggableId={p.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={getItemStyle(
                                snapshot.isDragging,
                                provided.draggableProps.style
                              )}
                            >
                              <p className="custom_tag special" key={index}>
                                {p.value === " " ? "_" : p.value}
                                <CloseOutlined
                                  onClick={() => handleBlockDelete(index)}
                                />
                              </p>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            {/* {parts.map((p, index) => {
              return !p.isspec ? (
                <Popover
                  key={index}
                  title={"Add new replacement"}
                  content={() => {
                    return (
                      <Form
                        form={replacement}
                        onFinish={(e) => handleReplacementSave(e)}
                      >
                        <Form.Item
                          name="replacement"
                          rules={[
                            {
                              required: true,
                              message: "Please input a replacement!",
                            },
                          ]}
                        >
                          <Input
                            id={`replacement${index}`}
                            placeholder="New replacement"
                          />
                        </Form.Item>
                        <Button htmlType="submit" type="primary">
                          Save
                        </Button>
                      </Form>
                    );
                  }}
                >
                  <p
                    onMouseEnter={() => mouseEnteredToTheBlock(index)}
                    className={`custom_tag ${
                      p.value.length > 1 ? "multi" : ""
                    }`}
                  >
                    {p.value.map((v, index2) => {
                      return (
                        <span key={index2}>
                          <span>{v}</span>
                          <CloseOutlined
                            onClick={() =>
                              handleInnerWordBlockDelete(index, index2)
                            }
                          />
                          {index2 !== p.value.length - 1 ? (
                            <span className="line_btw">|</span>
                          ) : (
                            ""
                          )}
                        </span>
                      );
                    })}
                  </p>
                </Popover>
              ) : (
                <p className="custom_tag special" key={index}>
                  {p.value === " " ? "_" : p.value}
                  <CloseOutlined onClick={() => handleBlockDelete(index)} />
                </p>
              );
            })} */}
          </div>
        </Col>
        <Col span={16}>
          <Form form={editor} onFinish={saveWordBlock}>
            <Form.Item
              className="no-margin"
              name="editor"
              rules={[
                {
                  required: true,
                  message: "Please input text!",
                },
              ]}
            >
              <Input
                ref={refContainer}
                onPaste={() => false}
                onCut={() => false}
              />
            </Form.Item>
            <small>
              Press enter to add a word block &nbsp;&nbsp; | &nbsp;&nbsp; Hover
              over blocks to add replacements.&nbsp;&nbsp; | &nbsp;&nbsp;
              Underscore replaces empty space.
            </small>
          </Form>
        </Col>
        <Col span={4}>
          <Button className="w-100" onClick={resetEditor} type="primary">
            Reset the editor
          </Button>
        </Col>
        <Col span={4}>
          <Button className="w-100" onClick={saveSentence} type="primary">
            Save the sentence
          </Button>
        </Col>
        <Col span={24}>
          <Table columns={columns} dataSource={sentences} />
        </Col>
      </Row>
    </div>
  );
};

export default App;
