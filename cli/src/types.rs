use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy)]
pub enum EntityType {
    Epic,
    Task,
    Idea,
    Doc,
    Tool,
    TestGroup,
    Test,
}

impl std::fmt::Display for EntityType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            EntityType::Epic => write!(f, "epic"),
            EntityType::Task => write!(f, "task"),
            EntityType::Idea => write!(f, "idea"),
            EntityType::Doc => write!(f, "doc"),
            EntityType::Tool => write!(f, "tool"),
            EntityType::TestGroup => write!(f, "testgroup"),
            EntityType::Test => write!(f, "test"),
        }
    }
}

impl std::str::FromStr for EntityType {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "epic" => Ok(EntityType::Epic),
            "task" => Ok(EntityType::Task),
            "idea" => Ok(EntityType::Idea),
            "doc" => Ok(EntityType::Doc),
            "tool" => Ok(EntityType::Tool),
            "testgroup" => Ok(EntityType::TestGroup),
            "test" => Ok(EntityType::Test),
            _ => Err(format!("Invalid entity type: {}", s)),
        }
    }
}

#[derive(Deserialize, Debug)]
pub struct Repository {
    pub name: String,
    pub path: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct RepositoryResponse {
    pub repositories: Vec<Repository>,
    #[serde(default)]
    pub base_path: String,
    #[serde(default)]
    pub server_mode: bool,
    #[serde(default)]
    pub error: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Task {
    pub id: String,
    pub title: String,
    pub state: String,
    #[serde(default)]
    pub epic: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct TaskResponse {
    pub tasks: Vec<Task>,
}

#[derive(Serialize)]
#[allow(dead_code)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub state: String,
}

#[derive(Deserialize, Debug)]
#[allow(dead_code)]
pub struct FileResponse {
    pub content: String,
}

// Test-related types
#[derive(Deserialize, Serialize, Debug)]
pub struct TestGroup {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct Test {
    pub id: String,
    pub name: String,
    pub group: Option<String>,
    pub description: Option<String>,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct TestStep {
    pub id: String,
    pub command: String,
    pub args: Vec<String>,
    pub order: i32,
}

#[derive(Deserialize, Serialize, Debug)]
pub struct TestExecution {
    pub id: String,
    pub test_id: String,
    pub timestamp: String,
    pub status: String,
    pub error: Option<String>,
}

#[derive(Deserialize, Debug)]
pub struct TestGroupResponse {
    pub groups: Vec<TestGroup>,
}

#[derive(Deserialize, Debug)]
pub struct TestResponse {
    pub tests: Vec<Test>,
}

#[derive(Deserialize, Debug)]
pub struct TestStepResponse {
    pub steps: Vec<TestStep>,
}

#[derive(Deserialize, Debug)]
pub struct TestExecutionResponse {
    pub executions: Vec<TestExecution>,
}
