const express = require("express")
const { spawn } = require("child_process")
const axios = require("axios")
const app = express()
const port = 3459

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        const parts = command.split(" ")
        const cmd = parts.shift()
        const args = parts

        const child = spawn(cmd, args, { shell: true })

        // Listen for data events (stdout)
        child.stdout.on("data", (data) => {
            console.log(data.toString())
        })

        // Listen for data events (stderr)
        child.stderr.on("data", (data) => {
            console.error(data.toString())
        })

        // Listen for the 'close' event
        child.on("close", (code) => {
            if (code === 0) {
                resolve()
            } else {
                // reject(new Error(`Command '${command}' failed with exit code ${code}`));
            }
        })
    }).catch(() => {})
}

app.use(express.json())

app.post("/artefarm_frontend", (req, res) => {
    res.sendStatus(200)
    const util = require("util")

    async function updateAndRestart() {
        try {
            let data

            if (req.body.ref.includes("main")) {
                // Step 1: pull the code
                await executeCommand("cd /var/www/ArteFarm-Frontend/ && git pull")

                // Step 2: Build the new Docker image
                await executeCommand("docker build -t artefrontend:1.0 /var/www/ArteFarm-Frontend/")

                // Step 3: Stop the running container
                await executeCommand("docker stop artefrontend")

                // Step 4: Remove the stopped container
                await executeCommand("docker rm artefrontend")

                // Step 5: Run a new container with the updated image
                await executeCommand(
                    "docker run -d --restart=always --name artefrontend -p 0.0.0.0:3645:3000 artefrontend:1.0"
                )

                messageContent = {
                    email: "ArteFarm github deployer from server",
                    avatar_url:
                        "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
                    embeds: [
                        {
                            title: `New push in ${req.body.repository.full_name} by ${req.body.sender.login} has been deployed`,
                            description: `${req.body.head_commit.message}`,
                            color: 10580736,
                            footer: {
                                text: "ArteFarm deployer",
                                icon_url: req.body.sender.avatar_url,
                            },
                            fields: [
                                {
                                    name: "Branch",
                                    value: req.body.ref,
                                },
                                {
                                    name: "Modified Files",
                                    value: req.body.head_commit.modified.join("\n"),
                                },
                            ],
                        },
                    ],
                }
                await axios
                    .post(
                        "https://discord.com/api/webhooks/1245232383893176351/6WunAE6qYqBmvNfOHH_VObJ93MY8V5swacQjZO4_ST0CvrmRgbzIvofCP6Ih4zXqQqoZ",
                        messageContent
                    )
                    .then(() => {
                        console.log("Message sent to Discord")
                    })
                    .catch((error) => {
                        console.error("Error sending message to Discord", error)
                    })
            }
        } catch (error) {
            console.error(error)
        }
    }

    updateAndRestart()
})

app.listen(port, () => {
    console.log(`Webhook listener started at http://localhost:${port}`)
})
