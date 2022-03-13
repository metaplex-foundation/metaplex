name: Bug report
title: "[Bug]: "
description: Report incorrect or unexpected behavior
labels: [bug, needs tests]
body:
  - type: markdown
    attributes:
      value: |
        Use Discord for questions: https://discord.gg/metaplex
  - type: dropdown
    id: package
    attributes:
      label: Which package is this bug report for?
      options:
        - storefront
        - candy machine ui
        - candy machine cli
        - other cli
        - gumdrop
        - other
    validations:
      required: true
  - type: textarea
    id: description
    attributes:
      label: Issue description
      description: |
        Describe the issue in as much detail as possible.

        Tip: You can attach images or log files by clicking this area to highlight it and then dragging files into it.
      placeholder: |
        Steps to reproduce with:
        1. do thing
        2. observe behavior
        3. see error logs below
    validations:
      required: true
  - type: textarea
    id: command
    attributes:
      label: Command
      description: If applicable, include the command you used. This will be automatically formatted into code, so no need for backticks.
      render: shell
      placeholder: |
        ts-node ~/metaplex/js/packages/cli/src/candy-machine-v2-cli.ts upload \
        -e devnet \
        -k ~/.config/solana/devnet.json \
        -cp config.json \
        -c example \
        ./assets
    validations:
      required: false
  - type: textarea
    id: logs
    attributes:
      label: Relevant log output
      description: Please copy and paste any relevant log output. This will be automatically formatted into code, so no need for backticks.
      render: shell
    validations:
      required: false
  - type: input
    id: os
    attributes:
      label: Operating system
      description: Which OS are you using?
    validations:
      required: true  
  - type: dropdown
    id: priority
    attributes:
      label: Priority this issue should have
      description: Please be realistic. If you need to elaborate on your reasoning, please use the Issue description field above.
      options:
        - Low (slightly annoying)
        - Medium (should be fixed soon)
        - High (immediate attention needed)
    validations:
      required: true
  - type: checkboxes
    id: docs
    attributes:
      label: Check the Docs First
      description: Make sure you check our docs first at https://docs.metaplex.com
      options:
        - label: I have checked the docs and it didn't solve my issue
          required: true
